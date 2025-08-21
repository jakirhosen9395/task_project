#!/bin/bash

echo "Waiting for Kafka to be ready..."
sleep 10

echo "Creating todo-events topic..."
kafka-topics --create \
  --topic todo-events \
  --bootstrap-server kafka:29092 \
  --partitions 3 \
  --replication-factor 1 \
  --if-not-exists

echo "Listing topics..."
kafka-topics --list --bootstrap-server kafka:29092

echo "Kafka initialization completed!"