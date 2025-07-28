#!/usr/bin/env python3
"""
Railway deployment diagnosis helper
"""
import subprocess
import sys

def check_railway_cli():
    """Check if Railway CLI is installed"""
    try:
        result = subprocess.run(['railway', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ Railway CLI is installed")
            return True
        else:
            print("❌ Railway CLI not working")
            return False
    except FileNotFoundError:
        print("❌ Railway CLI not installed")
        return False

def get_railway_status():
    """Get Railway project status"""
    try:
        print("🔍 Checking Railway project status...")
        result = subprocess.run(['railway', 'status'], capture_output=True, text=True)
        print(result.stdout)
        if result.stderr:
            print("Errors:", result.stderr)
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Error checking Railway status: {e}")
        return False

def get_railway_logs():
    """Get Railway logs"""
    try:
        print("📋 Getting Railway logs...")
        result = subprocess.run(['railway', 'logs'], capture_output=True, text=True)
        print("=== RAILWAY LOGS ===")
        print(result.stdout)
        if result.stderr:
            print("=== ERRORS ===")
            print(result.stderr)
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Error getting Railway logs: {e}")
        return False

def manual_checks():
    """Manual checks to perform"""
    print("\n🔧 MANUAL CHECKS TO PERFORM:")
    print("1. Go to Railway dashboard: https://railway.app/dashboard")
    print("2. Select your 'prompter' project")
    print("3. Check 'Deployments' tab for latest deployment")
    print("4. Check 'Logs' tab for error messages")
    print("5. Check 'Variables' tab for environment variables")
    print("6. Look for any red error indicators")
    
    print("\n📋 COMMON ISSUES:")
    print("- Environment variables missing")
    print("- Build failed (check build logs)")
    print("- App crashed on startup")
    print("- Wrong start command in Procfile")
    print("- Python version mismatch")

def main():
    print("🚀 Railway Deployment Diagnosis")
    print("=" * 50)
    
    if check_railway_cli():
        print("\n📊 Checking Railway status...")
        get_railway_status()
        
        print("\n📋 Getting logs...")
        get_railway_logs()
    else:
        print("\n⚠️ Railway CLI not available")
        print("Install with: npm install -g @railway/cli")
    
    manual_checks()
    
    print("\n" + "=" * 50)
    print("✅ Diagnosis complete!")

if __name__ == "__main__":
    main() 