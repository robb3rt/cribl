exports.name="OTLP Metrics";exports.version="0.1";exports.disabled=false;exports.group="Formatters";exports.sync=true;const cLogger=C.util.getLogger("func:otlp_metrics");const{OtelMetricsFormatter}=C.internal.otel;const statsInterval=6e4;let numDropped,numLocalNotMetric;let metricsFormatter;let statsReportInterval;let shouldDropNonMetricEvents;function resetStats(){metricsFormatter?.resetStats();numDropped=0;numLocalNotMetric=0}function reportStats(){const{numGaugeHistogram:t,numHistogramNoCount:e,numSummaryNoCount:r,numNotMetric:o}=metricsFormatter.getStats();cLogger.debug("Dropped events stats",{numGaugeHistogram:t,numHistogramNoCount:e,numSummaryNoCount:r,numNotMetric:o+numLocalNotMetric,numDropped});resetStats()}exports.init=t=>{const e=(t||{}).conf||{};shouldDropNonMetricEvents=e.dropNonMetricEvents||false;metricsFormatter=new OtelMetricsFormatter(cLogger);resetStats();clearInterval(statsReportInterval);statsReportInterval=setInterval(reportStats,statsInterval)};exports.process=t=>{if(!("__criblMetrics"in t)){numLocalNotMetric++;if(shouldDropNonMetricEvents){numDropped++;return null}else{return t}}const e=metricsFormatter?.formatEvent(t);if(e==null){if(shouldDropNonMetricEvents){numDropped++;return null}else{return t}}return e};exports.unload=()=>{metricsFormatter=undefined;clearInterval(statsReportInterval);statsReportInterval=undefined};exports.UT_getStats=()=>{const{numGaugeHistogram:t,numHistogramNoCount:e,numSummaryNoCount:r,numNotMetric:o}=metricsFormatter.getStats();return{numGaugeHistogram:t,numHistogramNoCount:e,numSummaryNoCount:r,numDropped,numNotMetric:o+numLocalNotMetric}};