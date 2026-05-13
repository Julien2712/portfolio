import os
import glob

def convert_and_update():
    try:
        from PIL import Image
    except ImportError:
        print("PIL is not installed. Please install it using: pip install Pillow")
        return

    # Find all PNG and JPG images
    image_paths = glob.glob('Image/**/*.png', recursive=True) + glob.glob('Image/**/*.jpg', recursive=True) + glob.glob('Image/**/*.jpeg', recursive=True)
    
    for path in image_paths:
        if path.endswith('icone.png'): # Keep favicon as png
            continue
        try:
            with Image.open(path) as img:
                webp_path = os.path.splitext(path)[0] + '.webp'
                img.save(webp_path, 'webp', quality=85)
                print(f"Converted: {path} -> {webp_path}")
                # os.remove(path) # Optional: Remove old image
        except Exception as e:
            print(f"Error converting {path}: {e}")

    # Update HTML/JS files to reference .webp instead of .png/.jpg
    html_files = glob.glob('*.html') + glob.glob('*.js') + glob.glob('*.css')
    for file in html_files:
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace occurrences of .png, .jpg, .jpeg with .webp (excluding icone.png)
        # This is a simple replacement, be careful with it
        # A safer way: replace specific paths found
        for path in image_paths:
            if path.endswith('icone.png'): continue
            old_name = os.path.basename(path)
            new_name = os.path.splitext(old_name)[0] + '.webp'
            content = content.replace(old_name, new_name)
            
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
            
    print("Done converting images and updating references.")

if __name__ == '__main__':
    convert_and_update()
