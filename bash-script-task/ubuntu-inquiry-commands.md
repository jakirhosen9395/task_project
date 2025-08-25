# Ubuntu Server Inquiry Commands

This README collects **essential commands** to inspect an Ubuntu server.  
Use them to find out what services, ports, packages, and logs exist on the machine.  
All commands are **read-only** (they don’t change system state).

---

## System Information
```bash
# OS, kernel, uptime
lsb_release -a
uname -sr
uptime -p
hostnamectl
```

## Services
```bash
# List all running services
systemctl list-units --type=service --state=running

# List all services (enabled/disabled/failed)
systemctl list-unit-files --type=service

# Failed services
systemctl --failed --type=service

# Status of a specific service (example: ssh)
systemctl status ssh
```

## Processes
```bash
# Show top CPU consuming processes
ps aux --sort=-%cpu | head -n 15

# Show top memory consuming processes
ps aux --sort=-%mem | head -n 15

# Real-time process monitoring (interactive)
top
htop   # (if installed)
```

## Ports and Network
```bash
# Show listening ports with PID and program
ss -tulpn

# Check which process uses port 80
ss -tulpn | grep :80
lsof -i :80
```

## Package Information
```bash
# List all installed packages
dpkg -l

# Search for a package (example: nginx)
dpkg -l | grep nginx

# Recent apt history (installs, upgrades, removes)
zgrep -h "Commandline:" /var/log/apt/history.log* | less
```

## Logs
```bash
# View system logs (journal)
journalctl --since today

# View logs for a specific service (example: ssh)
journalctl -u ssh --since "2025-08-01"

# Kernel logs
journalctl -k

# Authentication logs
sudo less /var/log/auth.log
```

## Users and Crontab
```bash
# List logged-in users
who

# Login history
last -F | head -n 20

# Current user’s crontab
crontab -l

# System-wide cron jobs
ls -l /etc/cron.* /etc/cron.d
```

---

## Quick Daily Checklist
1. `systemctl list-units --type=service --state=running` → Which services are up?  
2. `systemctl --failed --type=service` → Any failed services?  
3. `ss -tulpn` → Which ports are open/listening?  
4. `dpkg -l | wc -l` → Rough count of installed packages.  
5. `journalctl --since today` → Any critical errors today?  

---

**Note:** Always run with `sudo` if you get permission errors when reading logs or inspecting processes.
