# Security Configuration for TeleHealth Application

## HIPAA Compliance and Data Encryption

Pour la conformité HIPAA, les données sensibles des patients sont chiffrées dans la base de données. Cela inclut les notes médicales, les diagnostics, les traitements et autres informations de santé protégées (PHI).

### Variables d'environnement requises pour le chiffrement

Ajoutez les variables suivantes à votre fichier `.env`:

```
# Clés de chiffrement pour la conformité HIPAA (OBLIGATOIRES en production)
# Ces clés DOIVENT être définies dans les environnements de production
ENCRYPTION_KEY=your-strong-32-byte-encryption-key-here
ENCRYPTION_IV=your-16-byte-initialization-vector-here
```

> **IMPORTANT**: L'application utilise des clés de chiffrement par défaut en mode développement si ces valeurs ne sont pas définies.
> **N'utilisez JAMAIS les valeurs par défaut en production** car cela compromettrait la sécurité des données des patients.

### Génération de clés sécurisées

Pour générer une clé de chiffrement et un vecteur d'initialisation sécurisés, vous pouvez utiliser les commandes suivantes:

```bash
# Générer une clé de chiffrement de 32 octets (256 bits)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Générer un vecteur d'initialisation de 16 octets
node -e "console.log(require('crypto').randomBytes(16).toString('hex').slice(0, 16))"
```

### Liste de vérification pour le déploiement

1. Générer des clés de chiffrement uniques pour chaque environnement
2. Ajouter les clés à vos variables d'environnement ou à un coffre-fort de clés sécurisé
3. Vérifier que le chiffrement fonctionne correctement en testant la création de notes
4. Créer un plan de rotation des clés pour les environnements de production

### Notes de sécurité importantes

1. Ne jamais enregistrer les clés de chiffrement dans le contrôle de version
2. Utiliser différentes clés pour les environnements de développement, de préproduction et de production
3. Stocker les clés de chiffrement en toute sécurité à l'aide d'un service de gestion des secrets
4. Faire pivoter périodiquement les clés de chiffrement
5. Mettre en œuvre des contrôles d'accès appropriés aux clés

## Mesures de sécurité HIPAA supplémentaires

1. Tous les points de terminaison de l'API sont protégés par authentification
2. L'accès aux données des patients est restreint en fonction des rôles des utilisateurs
3. Les journaux d'audit suivent tous les accès aux informations des patients
4. Les données en transit sont protégées par TLS/SSL
5. Examens de sécurité réguliers et tests de pénétration

## Dépannage

Si vous rencontrez des erreurs liées au chiffrement:

1. Vérifiez que vos clés de chiffrement sont correctement définies dans les variables d'environnement
2. Assurez-vous que l'IV fait exactement 16 octets (caractères) de long
3. Consultez les fichiers journaux pour les erreurs spécifiques de chiffrement/déchiffrement
4. En mode développement, vous pouvez activer les messages d'erreur détaillés en définissant `NODE_ENV=development` 