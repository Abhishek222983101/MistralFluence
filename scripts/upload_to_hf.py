#!/usr/bin/env python3
"""
Phase 2C: Upload trained LoRA adapter to HuggingFace.
This creates a public record of your fine-tuning work for the hackathon judges.
"""

from huggingface_hub import HfApi, create_repo
import os

# Configuration
REPO_NAME = "mistralfluence-content-generator-7b"
ADAPTER_PATH = "models/mistralfluence-7b-lora"

# Your HF token is already configured via huggingface-cli login


def main():
    api = HfApi()

    # Get your username
    user_info = api.whoami()
    username = user_info["name"]
    repo_id = f"{username}/{REPO_NAME}"

    print(f"Logged in as: {username}")
    print(f"Target repo: {repo_id}")

    # Create repo (will fail if exists, that's okay)
    try:
        create_repo(repo_id=repo_id, repo_type="model", exist_ok=True)
        print(f"Repository created: https://huggingface.co/{repo_id}")
    except Exception as e:
        print(f"Repository may already exist: {e}")

    # Upload the adapter
    print(f"\nUploading adapter from {ADAPTER_PATH}...")
    api.upload_folder(
        folder_path=ADAPTER_PATH,
        repo_id=repo_id,
        repo_type="model",
        commit_message="Upload MistralFluence LoRA adapter - trained on 199 viral script examples",
    )

    print(f"\n✅ SUCCESS!")
    print(f"Your model is now live at: https://huggingface.co/{repo_id}")
    print(f"\nAdd this link to your hackathon submission!")


if __name__ == "__main__":
    main()
