import os
import urllib.request
import zipfile
import sys

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

KOKORO_MODEL_URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.int8.onnx"
KOKORO_VOICES_URL = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin"
VOSK_MODEL_URL = "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip"

def download_file(url, dest_path):
    if os.path.exists(dest_path):
        print(f"Already exists: {dest_path}")
        return
    print(f"Downloading {url} to {dest_path}...")
    
    def reporthook(blocknum, blocksize, totalsize):
        readsofar = blocknum * blocksize
        if totalsize > 0:
            percent = readsofar * 1e2 / totalsize
            s = f"\rProgress: {percent:5.1f}% [{readsofar}/{totalsize} bytes]"
            sys.stdout.write(s)
            sys.stdout.flush()
        else:
            sys.stdout.write(f"\rRead {readsofar} bytes")
            sys.stdout.flush()

    urllib.request.urlretrieve(url, dest_path, reporthook)
    print("\nDownload complete.")

def setup_models():
    os.makedirs(MODELS_DIR, exist_ok=True)
    
    kokoro_path = os.path.join(MODELS_DIR, "kokoro-v1.0.int8.onnx")
    download_file(KOKORO_MODEL_URL, kokoro_path)
    
    voices_path = os.path.join(MODELS_DIR, "voices-v1.0.bin")
    download_file(KOKORO_VOICES_URL, voices_path)
    
    vosk_zip_path = os.path.join(MODELS_DIR, "vosk-model-small-en-us-0.15.zip")
    vosk_dir_path = os.path.join(MODELS_DIR, "vosk-model-small-en-us-0.15")
    
    if not os.path.exists(vosk_dir_path):
        download_file(VOSK_MODEL_URL, vosk_zip_path)
        print(f"Extracting {vosk_zip_path}...")
        with zipfile.ZipFile(vosk_zip_path, 'r') as zip_ref:
            zip_ref.extractall(MODELS_DIR)
        print("Extraction complete.")
        try:
            os.remove(vosk_zip_path)
        except Exception as e:
            print(f"Could not remove zip file: {e}")
    else:
        print(f"Vosk model directory already exists: {vosk_dir_path}")

if __name__ == "__main__":
    setup_models()
