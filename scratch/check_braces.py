import re

with open('src/pages/Laboratorio.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Strip template strings & regular strings carefully
def analyze(code):
    lines = code.splitlines()
    stack = []
    for i, line in enumerate(lines, 1):
        # strip comments
        line_code = line.split('//')[0]
        in_str = None
        clean = ""
        for char in line_code:
            if in_str:
                if char == in_str:
                    in_str = None
            else:
                if char in ("'", '"', '`'):
                    in_str = char
                else:
                    clean += char
        for c in clean:
            if c == '{':
                stack.append(i)
            elif c == '}':
                if not stack:
                    print(f"Extra closing brace '}}' at line {i}")
                else:
                    stack.pop()
    if stack:
        print(f"Unclosed braces count: {len(stack)}")
        print(f"Unclosed braces opened at lines: {stack}")
    else:
        print("All braces balanced!")

analyze(content)
