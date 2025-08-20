# 📘 MongoDB Replica Set with Docker

এই ডকুমেন্টেশনটি দেখাবে কিভাবে Docker ব্যবহার করে একটি **৩-node MongoDB Replica Set Cluster** সেটআপ ও টেস্ট করা যায়।  
আমরা এখানে official MongoDB community image ব্যবহার করব:  
`mongodb/mongodb-community-server:7.0-ubi9`

---

## 🔹 Prerequisites
- Docker Desktop ইনস্টল থাকতে হবে  
- বেসিক Docker কমান্ড চালানোর জ্ঞান  
- টার্মিনাল / শেল অ্যাক্সেস  

---

## 🔹 Step 1: Docker Network তৈরি করা
```bash
docker network create mongo-cluster
```

---

## 🔹 Step 2: MongoDB Containers চালানো

```bash
# mongo1
docker run -d --name mongo1 --network mongo-cluster -p 27017:27017   -e MONGO_INITDB_ROOT_USERNAME=root   -e MONGO_INITDB_ROOT_PASSWORD=pass   mongodb/mongodb-community-server:7.0-ubi9 --replSet rs0

# mongo2
docker run -d --name mongo2 --network mongo-cluster -p 27018:27017   -e MONGO_INITDB_ROOT_USERNAME=root   -e MONGO_INITDB_ROOT_PASSWORD=pass   mongodb/mongodb-community-server:7.0-ubi9 --replSet rs0

# mongo3
docker run -d --name mongo3 --network mongo-cluster -p 27019:27017   -e MONGO_INITDB_ROOT_USERNAME=root   -e MONGO_INITDB_ROOT_PASSWORD=pass   mongodb/mongodb-community-server:7.0-ubi9 --replSet rs0
```

---

## 🔹 Step 3: Replica Set Initialize করা

```bash
docker exec -it mongo1 mongosh
```

```javascript
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo1:27017" },
    { _id: 1, host: "mongo2:27017" },
    { _id: 2, host: "mongo3:27017" }
  ]
})
```

---

## 🔹 Step 4: Replica Set Status দেখা

```javascript
rs.status()
```

👉 একটিকে PRIMARY এবং দুইটিকে SECONDARY দেখাবে।  

---

## 🔹 Step 5: Data Insert করা (Primary থেকে)

```javascript
use testDB
db.users.insertOne({name: "Rahim", age: 25})
db.users.find()
```

---

## 🔹 Step 6: Secondary থেকে Data Verify করা

```bash
docker exec -it mongo2 mongosh
```

```javascript
rs.slaveOk()
use testDB
db.users.find()
```

👉 Secondary থেকেও একই data দেখতে পাবে → Replication সফল।  

---

## 🔹 Step 7: Failover Test করা

Primary বন্ধ করো:  
```bash
docker stop mongo1
```

Secondary node এ status চেক করো:  
```bash
docker exec -it mongo2 mongosh
rs.status()
```

👉 কয়েক সেকেন্ড পর Secondary গুলোর মধ্যে একজন PRIMARY হয়ে যাবে।  

আবার Primary চালু করো:  
```bash
docker start mongo1
```

👉 এটি Secondary হিসেবে cluster এ join হবে।  

---

# ✅ Why We Did This?

### 1. **High Availability**
Replica Set থাকার ফলে MongoDB server down হলেও অন্য node Primary হয়ে যায় → ডাউনটাইম কমে যায়।

### 2. **Data Redundancy**
Secondary node গুলোতে data copy থাকে → Data loss এর ঝুঁকি কমে যায়।

### 3. **Automatic Failover**
Primary crash করলে Secondary থেকে নতুন Primary হয়ে যায় → System নিজে recover হয়।

### 4. **Scalable Reads**
Secondary node গুলো থেকে read query চালানো যায় → Performance বাড়ে এবং load balance হয়।

### 5. **Production Simulation**
লোকাল মেশিনে Docker দিয়ে cluster বানিয়ে practice করলে production এ deploy করার আগে সিস্টেমটা পরিষ্কারভাবে বোঝা যায়।

---

## 📌 Conclusion
এই গাইডের মাধ্যমে আমরা Docker ব্যবহার করে MongoDB Replica Set cluster তৈরি করলাম, data replication test করলাম এবং failover mechanism পরীক্ষা করলাম।  
👉 এর মাধ্যমে MongoDB এর **high availability, fault tolerance এবং scalability** কিভাবে কাজ করে সেটা বোঝা গেল।
