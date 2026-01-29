# Dockerfile
FROM nvidia/cuda:12.2.0-runtime-ubuntu22.04

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Install Python 3.12
RUN apt-get update && apt-get install -y \
    software-properties-common \
    curl \
    && add-apt-repository ppa:deadsnakes/ppa \
    && apt-get update \
    && apt-get install -y \
    python3.12 \
    python3.12-venv \
    python3.12-dev \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python3.12 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir opencv-python-headless && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONPATH=/app

EXPOSE 80

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80", "--reload"]