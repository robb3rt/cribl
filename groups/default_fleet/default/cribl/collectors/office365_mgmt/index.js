exports.name="Office 365 Management Activity";exports.version="0.1";exports.disabled=false;exports.hidden=true;exports.destroyable=false;const{httpSearch,isHttp200,RestVerb,HttpError,wrapExpr,DEFAULT_TIMEOUT_SECS,DEFAULT_HTTP_RETRY_CODES}=C.internal.HttpUtils;const{Expression,PartialEvalRewrite}=C.expr;let rootUrl;let authUrl;let planType;let tenantId;let publisherIdentifier;let appId;let clientSecret;let contentType;let exprArgs={};let batchSize;let filter;let earliest;let latest;let headers;let timeout;let ingestionLagSecs=0;let retryRules;const ENTERPRISE_ROOT="https://manage.office.com";const GCC_ROOT="https://manage-gcc.office.com";const GCC_HIGH_ROOT="https://manage.office365.us";const DOD_ROOT="https://manage.protection.apps.mil";const AUTH_URL="https://login.microsoftonline.com/${tenantId}/oauth2/token";const AUTH_HIGH_URL="https://login.microsoftonline.us/${tenantId}/oauth2/token";const LIST_SUBSCRIPTIONS_URL="${rootUrl}/api/v1.0/${tenantId}/activity/feed/subscriptions/list";const LIST_CONTENT_URL="${rootUrl}/api/v1.0/${tenantId}/activity/feed/subscriptions/content";const MS_24H=24*60*60*1e3;async function subscriptionExists(t,e){headers={Authorization:wrapExpr(`Bearer ${t}`)};const r={PublisherIdentifier:wrapExpr(publisherIdentifier)};const n={url:LIST_SUBSCRIPTIONS_URL,method:RestVerb.GET,params:r,headers,exprArgs,timeout,retryRules};e.debug("Listing Subscriptions",{listOpts:n});const i=await(await httpSearch(n,e)).extractResult()||[];e.debug("List Subscriptions result",{listOpts:n,result:i});const a=i.filter((t=>t.contentType.toLowerCase()===contentType.toLowerCase()));if(a&&a.length&&a[0].status==="enabled"){return}const s=i.filter((t=>t.status==="enabled")).map((t=>t.contentType));throw new Error(`Office365 management activity subscription for content type: ${contentType} does not exist, active subscriptions: ${s}`)}async function listContent(t,e){const r=e.logger();const n=[];const i=["contentType","contentId","contentUri","contentCreated","contentExpiration","source","host"];const a=new Expression(filter,{disallowAssign:true,partialEval:new PartialEvalRewrite((t=>!i.includes(t)))});const s=earliest.toISOString();const o=latest.toISOString();const l={PublisherIdentifier:wrapExpr(publisherIdentifier),contentType:wrapExpr(contentType),startTime:wrapExpr(s),endTime:wrapExpr(o)};const c={url:LIST_CONTENT_URL,method:RestVerb.GET,params:l,headers,exprArgs,timeout,retryRules};let p=0;let u;do{r.debug("Listing Content",{opts:c,ingestionLagMinutes:ingestionLagSecs/60});const t=await httpSearch({...c},e.logger());const i=await t.extractResult()||[];u=t.res.headers.NextPageUri;r.debug("List Content Results",{opts:c,page:p,result:i,nextPageUri:u});for(let t=0;t<i.length;t++){const s=i[t];s.source=s.contentUri;s.format="raw";if(!a.evalOn(i[t])){r.debug("Excluding content because it does not match filter",{content:i[t],filter});continue}r.debug("Content",{item:s});s.contentTime=new Date(s.contentCreated).getTime()/1e3;n.push(s);if(n.length>=batchSize){await e.addResults(n);n.length=0}}c.url=u;p++}while(u!=null);await e.addResults(n)}async function authenticate(t){const e={client_id:wrapExpr(exprArgs.appId),resource:wrapExpr(rootUrl),client_secret:wrapExpr(exprArgs.clientSecret),grant_type:"'client_credentials'"};const r={url:authUrl,method:RestVerb.POST,params:e,exprArgs,timeout,retryRules};t.debug("Authenticating");const n=await(await httpSearch(r,t)).extractResult("access_token");t.debug("Authentication done",{haveToken:n!=null});if(!n){throw new Error("Authentication failed!")}return n}function validateDateRange(){if(latest.getTime()-earliest.getTime()>MS_24H){throw new Error("Invalid Argument - Date range cannot exceed 24 hours!")}if(earliest.getTime()<Date.now()-MS_24H*7){throw new Error("Invalid Argument - Date range cannot go back more than 7 days in the past!")}}exports.init=t=>{const e=t.conf;filter=e.filter||"true";planType=e.plan_type;tenantId=e.tenant_id;publisherIdentifier=e.publisher_identifier||tenantId;appId=e.app_id;clientSecret=e.client_secret;contentType=e.content_type;batchSize=e.maxBatchSize||10;timeout=e.timeout!=null&&+e.timeout>=0?+e.timeout:DEFAULT_TIMEOUT_SECS*1e3;ingestionLagSecs=(e.ingestionLag!=null&&+e.ingestionLag>=0?+e.ingestionLag:0)*60;const r=Date.now();earliest=new Date(e.earliest!=null?(e.earliest-ingestionLagSecs)*1e3:r-ingestionLagSecs*1e3-MS_24H);latest=new Date(e.latest!=null?(e.latest-ingestionLagSecs)*1e3:r-ingestionLagSecs*1e3);retryRules=e.retryRules;validateDateRange();if(!["audit.azureactivedirectory","audit.exchange","audit.sharepoint","audit.general","dlp.all"].includes(contentType.toLowerCase())){throw new Error(`Invalid content type: ${contentType}`)}if(!["enterprise_gcc","gcc","gcc_high","dod"].includes(planType)){throw new Error(`Invalid Subscription Plan: ${planType}`)}if(planType==="enterprise_gcc"){rootUrl=ENTERPRISE_ROOT;authUrl=AUTH_URL}else if(planType==="gcc"){rootUrl=GCC_ROOT;authUrl=AUTH_URL}else if(planType==="gcc_high"){rootUrl=GCC_HIGH_ROOT;authUrl=AUTH_HIGH_URL}else{rootUrl=DOD_ROOT;authUrl=AUTH_URL}exprArgs={rootUrl,planType,tenantId,appId,clientSecret,contentType,earliest,latest};const n=["tenantId","appId","clientSecret","contentType"].filter((t=>exprArgs[t]==null));if(n.length)throw new Error(`Missing required configuration=${n}`)};exports.discover=async t=>{const e=t.logger();const r=await authenticate(e);await subscriptionExists(r,e);await listContent(r,t)};exports.collect=async(t,e)=>{const r=e.logger();const n=await authenticate(r);const i={url:t.contentUri,params:{},method:RestVerb.GET,headers:{Authorization:wrapExpr(`Bearer ${n}`)},timeout,retryRules};const a=await httpSearch(i,r);a.res.on("end",(()=>{if(!isHttp200(a.res.statusCode)){const t=new HttpError("Office365 collect error",a.res.statusCode,{host:a.host,port:a.port,path:a.path,method:a.method});e.reportError(t,"JobFatal").catch((()=>{}))}})).on("error",(t=>{e.reportError(t,"JobFatal").catch((()=>{}))}));return a.stream()};