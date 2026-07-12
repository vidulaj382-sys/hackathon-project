import sympy
import random

def generate_drill(level="Level 1 (Iron)"):
    if "Level 4" in level:
        # Level 4 (Gold): Double-digit multiplication
        a = random.randint(10, 30)
        b = random.randint(2, 9)
        operator = '*'
        spoken_op = "times"
    elif "Level 3" in level:
        # Level 3 (Silver): Double-digit addition/subtraction
        a = random.randint(10, 99)
        b = random.randint(10, 99)
        operator = random.choice(['+', '-'])
        spoken_op = "plus" if operator == '+' else "minus"
    elif "Level 2" in level:
        # Level 2 (Bronze): Double-digit plus single-digit
        a = random.randint(10, 50)
        b = random.randint(1, 9)
        operator = random.choice(['+', '-'])
        spoken_op = "plus" if operator == '+' else "minus"
    else:
        # Level 1 (Iron): Single-digit addition/subtraction
        a = random.randint(1, 15)
        b = random.randint(1, 9)
        operator = random.choice(['+', '-'])
        spoken_op = "plus" if operator == '+' else "minus"
        
    if operator == '-' and a < b:
        a, b = b, a
        
    expr_str = f"{a} {operator} {b}"
    expr = sympy.sympify(expr_str)
    
    spoken = f"What is {a} {spoken_op} {b}?"
    return spoken, expr_str, int(expr)

def evaluate_answer(spoken_input, actual_answer):
    if not spoken_input:
        return False
        
    # Normalize input
    spoken_input = spoken_input.lower().strip().replace('-', ' ')
    
    # 1. Check if the string directly contains the actual digit
    if str(actual_answer) in spoken_input:
        return True
        
    # 2. Map word numbers to integers
    words_map = {
        'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
        'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
        'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13,
        'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17,
        'eighteen': 18, 'nineteen': 19, 'twenty': 20, 'thirty': 30,
        'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
        'eighty': 80, 'ninety': 90
    }
    
    # Split spoken input into individual words
    words = spoken_input.split()
    
    # Check for direct word matches (e.g. "seventeen")
    for w in words:
        if w in words_map and words_map[w] == actual_answer:
            return True
            
    # Check for compound word matches (e.g. "twenty" "five" -> 25)
    for i in range(len(words) - 1):
        tens = words[i]
        ones = words[i+1]
        if tens in words_map and ones in words_map:
            val = words_map[tens] + words_map[ones]
            if val == actual_answer:
                return True
                
    # 3. Fallback to mathparse
    try:
        from mathparse import mathparse
        parsed = mathparse.parse(spoken_input)
        return abs(float(parsed) - actual_answer) < 0.1
    except:
        pass
        
    return False

