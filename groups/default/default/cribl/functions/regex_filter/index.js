exports.name="Regex Filter";exports.version="0.2";exports.group="Standard";exports.sync=true;const{NamedGroupRegExp}=C.util;const{NestedPropertyAccessor}=C.expr;let regexList=[];let field="_raw";exports.init=e=>{const r=e.conf||{};regexList=[];if(r.regex){regexList.push(new NamedGroupRegExp(r.regex))}else{throw new Error("missing required parameter: regex")}if(r.regexList&&r.regexList.length>0){for(let e=0;e<r.regexList.length;e++){regexList.push(new NamedGroupRegExp(r.regexList[e].regex))}}field=new NestedPropertyAccessor(r.field||"_raw")};exports.process=e=>{const r=field.get(e);for(let e=0;e<regexList.length;e++){regexList[e].lastIndex=0;if(regexList[e].test(r)){return undefined}}return e};