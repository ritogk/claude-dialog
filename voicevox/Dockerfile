FROM voicevox/voicevox_engine:cpu-ubuntu20.04-latest

USER root

# Install Lambda Runtime Interface Client
RUN /opt/python/bin/pip3 install awslambdaric requests

# Copy handler and startup script
COPY handler.py /opt/voicevox_engine/handler.py
COPY startup.sh /opt/voicevox_engine/startup.sh
RUN chmod +x /opt/voicevox_engine/startup.sh

WORKDIR /opt/voicevox_engine

ENTRYPOINT ["/opt/voicevox_engine/startup.sh"]
