FROM python:3.12-slim
WORKDIR /app
COPY verixa /app/verixa
RUN useradd --uid 10001 --create-home verixa && mkdir /data && chown verixa:verixa /data
USER 10001:10001
ENV VERIXA_DB=/data/state.db PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
EXPOSE 8788
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=3s CMD python3 -c "import os,ssl,urllib.request; tls=bool(os.environ.get('VERIXA_TLS_CERT')); urllib.request.urlopen(('https' if tls else 'http')+'://127.0.0.1:8788/healthz',timeout=2,context=ssl._create_unverified_context() if tls else None)"
CMD ["python3", "-m", "verixa", "serve", "--host", "0.0.0.0", "--port", "8788"]
