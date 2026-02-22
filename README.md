# Growth Engine

Meta Ads management, A/B experiment engine, multi-tenant agencies, audit-proof governance.

## Setup

```bash
# 1. Clone en install
npm install

# 2. Kopieer env en vul in
cp .env.example .env

# 3. Genereer keys
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Gebruik output 2x: een keer voor ENCRYPTION_KEY, een keer voor NEXTAUTH_SECRET

# 4. Database migreren
npm run db:migrate
npm run db:generate

# 5. Start app
npm run dev

# 6. Start background worker (apart terminal)
npm run worker
```

## Onboarding flow

1. Ga naar http://localhost:3000/onboarding
2. Maak agency aan
3. Voeg client toe
4. Verbind Meta account
5. Selecteer ad account
6. Project aanmaken → dashboard

## Meta Developer Console

1. Maak app aan op developers.facebook.com (type: Business)
2. Voeg toe: Facebook Login for Business
3. Permissions: ads_management, ads_read, business_management
4. OAuth Redirect URI: http://localhost:3000/api/auth/callback/facebook

## Testing checklist

- [ ] /onboarding doorlopen zonder fouten
- [ ] /api/meta/ad-accounts geeft accounts terug
- [ ] Campaign aanmaken en pauzeren
- [ ] Insights ophalen → InsightDaily rows in DB
- [ ] Experiment aanmaken, starten, ticken
- [ ] Governance export JSON downloaden
- [ ] RBAC: ANALYST kan geen campaign aanmaken
