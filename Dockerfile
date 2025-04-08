FROM python
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
RUN apt-get update && \
    apt-get install -y nodejs npm && \
    rm -rf /var/lib/apt/lists/*
EXPOSE 5000
CMD [ "python","app.py" ]