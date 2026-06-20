const tracer = require('dd-trace')

export function initializeTracing() {
  tracer.init({
    profiling: true
  })
}