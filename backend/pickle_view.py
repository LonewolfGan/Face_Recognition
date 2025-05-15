import pickle

with open('backend\embeddings.pkl', 'rb') as f:
    data = pickle.load(f)

print(type(data))   # Pour voir le type de l'objet
print(data)         # Pour voir le contenu (ou un aperçu)
