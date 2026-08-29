"""
Offline job to generate embeddings for skills and resources.
"""

def main():
    """
    Main entrypoint for catalog embedding generation.
    """
    # OPTIMIZATION TARGET: Load all items without embeddings, use sentence-transformers, save back to pgvector column
    print("Generating embeddings... (TODO)")

if __name__ == "__main__":
    main()
