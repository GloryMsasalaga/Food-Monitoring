import json
import re
import logging
from fastapi import FastAPI, Request, Response, HTTPException
from googletrans import Translator
from pydantic import BaseModel
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
import logging
import psycopg2
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# # Initialize Firebase
# cred = credentials.Certificate("path/to/firebase_credentials.json")
# firebase_admin.initialize_app(cred)
# firestore_db = firestore.client()

# PostgreSQL connection
pg_conn = psycopg2.connect(
    dbname="food_monitoring",
    user="postgres",
    password="root",
    host="localhost",
    port="5432"
)
pg_cursor = pg_conn.cursor()

class Chatbot:
    def __init__(self, training_file):
        # load and train
        with open(training_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        text = [item['text'] for item in data]
        intent = [item['intent'] for item in data]
        self.nlp = Pipeline([
            ('vectorizer', CountVectorizer()),
            ('classifier', LogisticRegression())
        ])
        self.nlp.fit(text, intent)
        
        #translator for lang detect & translation
        self.translator = Translator()
        
        #trigger words & keywords
        self.greetings = ['hi', 'hello', 'hey', 'habari!', 'asubuhi', 'mchana', 'usiku', 'mambo']
        self.farewells = ['bye', 'goodbye', 'see you', 'tutaonana', 'baadaye']
        self.dietary_kw = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'halal']
        self.health_kw = ['kisukari', 'moyo', 'pressure', 'cholesterol', 'sukari', 'shinikizo', 'magonjwa']
        self.food_kw = ['food', 'meal', 'snack', 'breakfast', 'lunch', 'dinner', 'chakula']
        
    def detect_lang(self, text):
        lang = self.translator.detect(text).lang
        return 'sw' if lang == 'sw' else 'en'
    
    def extract_budget(self,text):
        m = re.search(r'(\d+)', text)
        return int(m.group(1)) if m else None
    
    def extract_dietary(self, text):
        return [k for k in self.dietary_kw if k in text.lower()]
    
    def extract_health(self, text):
        return [h for h in self.health_kw if h in text.lower()]
    
    def extract_food(self, text):
        return [f for f in self.food_kw if f in text.lower()]
    
    def get_intent(self, text):
        intent = self.nlp.predict([text])[0]
        b = self.extract_budget(text)
        if b is not None and b < 500:
            return 'unknown'
        return intent
    
    def respond(self, text):
        lang = self.detect_lang(text)
        low = text.lower()
        
        # Tokenize to check for exact greeting match
        tokens = re.findall(r'\b\w+\b', low)
        
         # 3. Greetings (only respond if message is simple greeting)
        if any(g in tokens for g in self.greetings) and len(tokens) <= 4:
            return {
                'en': "Hello! How can I help you today?",
                'sw': "Habari! Naweza kukusaidia vipi leo?"
            }[lang]
            
        # 3. Farewells
        if any(f in low for f in self.farewells):
            return{
                'en': 'Goodbye! Have a great day!',
                'sw': 'Tutaonana! Uwe na siku njema!'
            }[lang]
            
        # 4. Entity extraction
        budget = self.extract_budget(text)
        dietary = self.extract_dietary(text)
        health = self.extract_health(text)
        food = self.extract_food(text)
        intent = self.get_intent(text)
        
        # Generate response
        if intent in ['food', 'food_suggestion_diet', 'food_suggestion', 'drink_suggestion', 'drink']:
            tier = ('low' if not budget or budget < 1000
                    else 'medium' if budget < 2500
                    else 'high')
            options = {
                'low': ['samosa', 'maandazi', 'chapati'],
                'low': ['soda', 'juice', 'water'],
                'medium': ['pilau', 'ugali', 'wali nyama'],
                'high': ['biryani', 'nyama choma', 'pizza', 'full course meal']
            }[tier]
            reply = f"Based on your budget ({budget}), try: {', '.join(options)}."
            
        elif intent in ['drink_suggestion']:
            reply = "Try fresh juices or bottled soda-depends on your taste!"
        
        elif intent == 'disease_related' or health:
            reply = "Consult a doctor for personalized advice."
            
        elif 'exercise' in intent:
            reply = "Exercise is important for health. Try to include it in your routine."
        
        else:
            reply = "I'm not sure how to help with that. Can you please clarify?"
            
        # 5. Show extracted entities
        entities = []
        if budget: entities.append(f"Budget: {budget}")
        if dietary: entities.append(f"Dietary: {dietary}")
        if health: entities.append(f"Health: {health}")
        if food: entities.append(f"Food: {food}")
        if entities:
            reply += f"\n\nExtracted entities:\n" + "\n".join(entities)
            
        # 6. Language translation
        if lang == 'sw':
            reply = self.translator.translate(reply, dest='sw').text
        return reply

        #save and load the response
        self.save_response_to_file(text, reply)
        self.log_conversation(text, reply)
        
        return reply
    
    def save_response_to_file(self, text, reply):
        with open('conversation_log.txt', 'a', encoding='utf-8') as f:
            f.write(f"User: {text}\nBot: {reply}\n\n")
            
    def save_response_to_file(self, text, reply):
        """Save the user message and bot response to a file."""
        with open('conversation_log.txt', 'a', encoding='utf-8') as f:
            f.write(f"User: {text}\n")
            f.write(f"Bot: {reply}\n")
            f.write("-" * 50 + "\n")
            
    def log_conversation(self, text, reply):
        """Log the user message and bot response."""
        logging.info(f"User: {text}")
        logging.info(f"Bot: {reply}")
        
# Load chatbot
load_file = r'C:\Users\hp\desktop\Food-Monitoring\app\templates\chatbot_training_data.json'
bot = Chatbot(load_file)

# Pydantic model for chat messages
class ChatMessage(BaseModel):
    message: str

# Pydantic model for retraining data
class RetrainData(BaseModel):
    data: list

# Routes
@app.get("/")
def home():
    return {"message": "Welcome to the FastAPI Chatbot API"}

@app.post("/chat")
def chat(message: ChatMessage):
    user_message = message.message
    bot_response = bot.respond(user_message)
    return {"response": bot_response}

@app.post("/retrain")
def retrain(data: RetrainData):
    new_data = data.data
    if not new_data:
        raise HTTPException(status_code=400, detail="No training data provided")

    # Append new data to the training file
    with open(load_file, 'r+', encoding='utf-8') as f:
        existing_data = json.load(f)
        existing_data.extend(new_data)
        f.seek(0)
        json.dump(existing_data, f, indent=4)

    # Retrain the model
    bot.__init__(load_file)
    return {"message": "Retraining complete"}

@app.get("/fetch-postgres")
def fetch_postgres():
    try:
        pg_cursor.execute("SELECT * FROM your_table_name")
        rows = pg_cursor.fetchall()
        return {"data": rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# @app.get("/fetch-firebase")
# def fetch_firebase():
#     try:
#         docs = firestore_db.collection("your_collection_name").stream()
#         data = [{doc.id: doc.to_dict()} for doc in docs]
#         return {"data": data}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# Run the app
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)    