import re

with open('src/pages/Laboratorio.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

div_stack = []
for i, line in enumerate(lines, 1):
    # match <div or </div>
    matches = re.findall(r'</?div[^>]*>', line)
    for m in matches:
        if m.startswith('</div'):
            if not div_stack:
                print(f"Extra </div> at line {i}")
            else:
                div_stack.pop()
        else:
            div_stack.append(i)

print("Remaining open divs count:", len(div_stack))
for l in div_stack:
    print("  Unclosed <div at line:", l)
