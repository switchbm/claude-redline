#!/usr/bin/env python3
"""Build script to compile the React frontend and bundle it into the Python package."""

import os
import shutil
import subprocess
import sys
from pathlib import Path


def main():
    """Main build orchestration."""
    # Determine project root
    project_root = Path(__file__).parent.resolve()
    frontend_dir = project_root / "frontend"
    dist_dir = frontend_dir / "dist"
    static_dir = project_root / "src" / "redline" / "static"

    print("🔧 Building Redline UI...")
    print(f"Project root: {project_root}")
    print(f"Frontend dir: {frontend_dir}")

    # Check if frontend directory exists
    if not frontend_dir.exists():
        print(f"❌ Error: Frontend directory not found at {frontend_dir}")
        sys.exit(1)

    # Change to frontend directory
    os.chdir(frontend_dir)

    # Install npm dependencies
    print("\n📦 Installing npm dependencies...")
    try:
        subprocess.run(["npm", "install"], check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Error installing dependencies: {e}")
        sys.exit(1)

    # Build the frontend
    print("\n🏗️  Building frontend...")
    try:
        subprocess.run(["npm", "run", "build"], check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Error building frontend: {e}")
        sys.exit(1)

    # Check if dist directory was created
    if not dist_dir.exists():
        print(f"❌ Error: Build output not found at {dist_dir}")
        sys.exit(1)

    # Clear existing static directory
    if static_dir.exists():
        print(f"\n🧹 Cleaning existing static directory: {static_dir}")
        shutil.rmtree(static_dir)

    # Copy dist contents to static
    print(f"\n📋 Copying build artifacts to {static_dir}...")
    shutil.copytree(dist_dir, static_dir)

    # Verify the copy
    index_html = static_dir / "index.html"
    if not index_html.exists():
        print(f"❌ Error: index.html not found in {static_dir}")
        sys.exit(1)

    print("\n✅ Build completed successfully!")
    print(f"   Static assets are ready at: {static_dir}")

    # Return to project root
    os.chdir(project_root)


if __name__ == "__main__":
    main()
