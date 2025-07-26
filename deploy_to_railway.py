#!/usr/bin/env python3
"""
Deploy to Railway script
"""
import subprocess
import os
import sys

def run_command(command, description):
    print(f"🚀 {description}...")
    print(f"Command: {command}")
    
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully!")
        if result.stdout:
            print(f"Output: {result.stdout}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed!")
        print(f"Error: {e.stderr}")
        return False

def check_railway_cli():
    """Check if Railway CLI is installed"""
    try:
        result = subprocess.run(["railway", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Railway CLI found: {result.stdout.strip()}")
            return True
        else:
            print("❌ Railway CLI not found")
            return False
    except FileNotFoundError:
        print("❌ Railway CLI not installed")
        return False

def deploy_to_railway():
    print("🚀 Railway Deployment Script")
    print("=" * 50)
    
    # Check if Railway CLI is installed
    if not check_railway_cli():
        print("\n📋 INSTALL RAILWAY CLI:")
        print("1. Install Railway CLI: npm install -g @railway/cli")
        print("2. Login: railway login")
        print("3. Run this script again")
        return False
    
    # Check if logged in
    if not run_command("railway whoami", "Checking Railway login status"):
        print("\n📋 LOGIN TO RAILWAY:")
        print("Run: railway login")
        return False
    
    # Deploy to Railway
    print("\n🚀 DEPLOYING TO RAILWAY...")
    
    # Initialize Railway project if needed
    if not os.path.exists(".railway"):
        if not run_command("railway init", "Initializing Railway project"):
            return False
    
    # Deploy
    if not run_command("railway up", "Deploying to Railway"):
        return False
    
    # Get the deployment URL
    if not run_command("railway domain", "Getting deployment URL"):
        return False
    
    print("\n✅ DEPLOYMENT COMPLETED!")
    print("Check your Railway dashboard for the deployment URL")
    
    return True

if __name__ == "__main__":
    deploy_to_railway() 