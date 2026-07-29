FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

ARG INSTALL_DEV=false

COPY requirements.txt requirements-dev.txt ./

RUN python -m pip install --upgrade pip \
    && if [ "$INSTALL_DEV" = "true" ]; then \
        python -m pip install -r requirements-dev.txt; \
    else \
        python -m pip install -r requirements.txt; \
    fi
COPY . .

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl --fail --silent http://localhost:5001/health/ready > /dev/null || exit 1

CMD ["sh", "scripts/start.sh"]