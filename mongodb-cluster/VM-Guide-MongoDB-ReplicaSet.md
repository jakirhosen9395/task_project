# 📘 MongoDB Replica Set with Ubuntu VMs

এই ডকুমেন্টেশন দেখাবে কিভাবে ৩টা আলাদা **Ubuntu VM**-এ MongoDB Replica Set Cluster সেটআপ ও টেস্ট করা যায়।  
আমরা এখানে official MongoDB 8.0 community edition ব্যবহার করব।  

---

## 🔹 Prerequisites
- ৩টা VM তৈরি করতে হবে (VirtualBox/VMware/Proxmox/Cloud যেকোনো কিছুতে)  
- প্রতিটা VM-এ Ubuntu install থাকতে হবে  
- প্রতিটা VM একে অপরকে ping করতে পারবে (একই Network এ থাকতে হবে)  
- প্রতিটা VM-এ sudo access থাকতে হবে  

👉 Example IPs:  
- VM1 → `192.168.56.101`  
- VM2 → `192.168.56.102`  
- VM3 → `192.168.56.103`  

---

## 🔹 Step 1: MongoDB Install করা (সবগুলো VM-এ)

```bash
# MongoDB GPG key add করুন
curl -fsSL https://pgp.mongodb.com/server-8.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-8.0.gpg

# MongoDB repo যোগ করুন
echo "deb [signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg] https://repo.mongodb.org/apt/ubuntu $(lsb_release -sc)/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list

# Update & install MongoDB
sudo apt update
sudo apt install -y mongodb-org
```

চেক করুন:  
```bash
mongod --version
```

---

## 🔹 Step 2: Data Folder তৈরি করা

প্রতিটা VM-এ রান করুন:
```bash
sudo mkdir -p /var/lib/mongo
sudo chown -R $USER:$USER /var/lib/mongo
```

---

## 🔹 Step 3: mongod চালানো (সবগুলো VM-এ)

**VM1**:
```bash
mongod --replSet rs0 --port 27017 --dbpath /var/lib/mongo   --bind_ip 0.0.0.0 --fork --logpath /var/lib/mongo/mongod.log
```

**VM2**:
```bash
mongod --replSet rs0 --port 27017 --dbpath /var/lib/mongo   --bind_ip 0.0.0.0 --fork --logpath /var/lib/mongo/mongod.log
```

**VM3**:
```bash
mongod --replSet rs0 --port 27017 --dbpath /var/lib/mongo   --bind_ip 0.0.0.0 --fork --logpath /var/lib/mongo/mongod.log
```

👉 সব VM-এ 27017 port ব্যবহার হবে (কারণ আলাদা মেশিনে আছে)।

---

## 🔹 Step 4: Replica Set Initialize করা (VM1 থেকে)

VM1 এ connect করুন:
```bash
mongosh --host 192.168.56.101 --port 27017
```

```javascript
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "192.168.56.101:27017" },
    { _id: 1, host: "192.168.56.102:27017" },
    { _id: 2, host: "192.168.56.103:27017" }
  ]
})
```

Check:
```javascript
rs.status()
```

👉 একজন **PRIMARY**, দুইজন **SECONDARY** হবে।  

---

## 🔹 Step 5: Replication Test

**Primary (VM1):**
```javascript
use testDB
db.users.insertOne({name: "Rahim", age: 25})
db.users.find()
```

**Secondary (VM2):**
```bash
mongosh --host 192.168.56.102 --port 27017
```

```javascript
rs.slaveOk()
use testDB
db.users.find()
```

👉 একই data Secondary তেও দেখাবে ✅  

---

## 🔹 Step 6: Failover Test

**VM1 বন্ধ করুন (Primary):**
```bash
sudo pkill mongod
```

**VM2 status চেক করুন:**
```bash
mongosh --host 192.168.56.102 --port 27017
rs.status()
```

👉 কয়েক সেকেন্ড পর Secondary গুলোর মধ্যে একজন PRIMARY হবে।  

আবার VM1 চালু করলে:
```bash
mongod --replSet rs0 --port 27017 --dbpath /var/lib/mongo   --bind_ip 0.0.0.0 --fork --logpath /var/lib/mongo/mongod.log
```

👉 VM1 cluster এ Secondary হিসেবে join হবে।  

---

## 🔹 (Optional) systemd Service

`/etc/systemd/system/mongod.service` ফাইল তৈরি করুন:

```ini
[Unit]
Description=MongoDB Replica Set Node
After=network.target

[Service]
User=mongodb
ExecStart=/usr/bin/mongod --replSet rs0 --port 27017 --dbpath /var/lib/mongo --bind_ip 0.0.0.0
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable করুন:
```bash
sudo systemctl daemon-reload
sudo systemctl enable mongod
sudo systemctl start mongod
```

---

# ✅ Why We Did This?

- **High Availability** → Primary down হলেও Secondary promote হয়ে যায়।  
- **Data Redundancy** → সব node-এ data copy থাকে।  
- **Automatic Failover** → Cluster নিজে recover করে।  
- **Production Simulation** → লোকাল VM দিয়ে real distributed system practice করা যায়।  

---

## 📌 Conclusion
এই গাইডের মাধ্যমে আমরা **৩টা VM**-এ MongoDB Replica Set cluster তৈরি করলাম, data replication test করলাম এবং failover mechanism পরীক্ষা করলাম।  
👉 এর মাধ্যমে production cluster-এর **high availability, fault tolerance এবং scalability** প্র্যাকটিস করা সম্ভব।  

---

✨ এখন আপনি চাইলে authentication (keyFile + user/password) যোগ করতে পারেন, যাতে nodes গুলো secure ভাবে communicate করে।  
