#!/bin/bash
set -e

cd /opt/voicevox_engine

# Start VOICEVOX engine in background during Lambda INIT
/opt/python/bin/python3 run.py \
  --voicelib_dir=/opt/voicevox_core/ \
  --host 0.0.0.0 \
  --port 50021 \
  --cpu_num_threads 2 &

# Wait for engine readiness (max ~60s)
for i in $(seq 1 120); do
  if curl -s http://localhost:50021/version > /dev/null 2>&1; then
    echo "VOICEVOX engine ready"
    break
  fi
  sleep 0.5
done

# Start Lambda runtime
exec /opt/python/bin/python3 -m awslambdaric handler.lambda_handler
