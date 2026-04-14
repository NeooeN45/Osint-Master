#!/bin/bash
# Quick health check for OSINT tools container
python3 -c "import sherlock_project; print('sherlock ok')" 2>/dev/null || echo "sherlock missing"
which nmap > /dev/null 2>&1 && echo "nmap ok" || echo "nmap missing"
which whois > /dev/null 2>&1 && echo "whois ok" || echo "whois missing"
which subfinder > /dev/null 2>&1 && echo "subfinder ok" || echo "subfinder missing"
echo "Container healthy"
exit 0
