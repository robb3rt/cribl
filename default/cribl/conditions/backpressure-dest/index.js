exports.name="Destination Backpressure Activated";exports.type="metric";exports.category="destinations";let id;let name;let __workerGroup;let timeWindow;let notifyOnResolution;exports.init=e=>{id=e.pid;const t=e.conf||{};({name,__workerGroup,timeWindow,notifyOnResolution}=t);timeWindow=timeWindow||"60s";notifyOnResolution=notifyOnResolution||false};exports.build=()=>{let e="";let t=`_metric === 'backpressure.outputs' && output === '${name}'`;const i=[{name:"output",value:`'${name}'`},{name:"timewindow",value:`'${timeWindow}'`},{name:"_metric",value:"'backpressure.outputs'"}];if(__workerGroup){t=`${t} && __worker_group === '${__workerGroup}'`;e=` in group ${__workerGroup}`}return{filter:t,pipeline:{conf:{functions:[{id:"aggregation",conf:{timeWindow,aggregations:["max(_value).as(backpressure_type)"],lagTolerance:"20s",idleTimeLimit:"20s"}},{id:"eval",conf:{add:i}},{id:"eval",filter:"backpressure_type === 0 || backpressure_type === undefined",conf:{add:[{name:"status",value:"'DISENGAGED'"},{name:"_raw",value:`'Backpressure is disengaged for destination ${name}${e}'`}]}},{id:"eval",filter:"backpressure_type === 1",conf:{add:[{name:"status",value:"'BLOCKING'"},{name:"_raw",value:`'Backpressure (blocking) is engaged for destination ${name}${e}'`}]}},{id:"eval",filter:"backpressure_type === 2",conf:{add:[{name:"status",value:"'DROPPING'"},{name:"_raw",value:`'Backpressure (dropping) is engaged for destination ${name}${e}'`}]}},{id:"notifications",conf:{id,field:"status",deduplicate:notifyOnResolution}},{id:"drop",filter:`!(${notifyOnResolution}) && status === 'DISENGAGED'`}]}}}};