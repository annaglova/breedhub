# Supabase Connection Guide for BreedHub

## Current Issue

The Supabase server at `dev.dogarray.com:8020` is located in a private network (192.168.88.113) and cannot be accessed directly from your browser.

## Solutions

### Option 1: SSH Tunnel (Quick Fix)

If you have SSH access to the server, you can create a tunnel:

```bash
# Replace 'username' with your actual username
ssh -L 8020:localhost:8020 username@dev.dogarray.com
```

Then update your `.env` file:
```env
VITE_SUPABASE_URL=http://localhost:8020
VITE_SUPABASE_ANON_KEY=your_existing_key
```

### Option 2: Use Public Supabase Instance (Recommended)

1. Create a free account at https://supabase.com
2. Create a new project
3. Get your project URL and anon key from the project settings
4. Update your `.env` file:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

### Option 3: VPN Access

If your organization has a VPN, connect to it to access the private network directly.

## Testing Connection

Visit http://localhost:5173/test-supabase to verify your connection is working.

## Troubleshooting

1. **ERR_ADDRESS_UNREACHABLE**: The server is not accessible from your network
2. **401 Unauthorized**: Check your anon key is correct
3. **CORS errors**: The server should already have CORS configured for all origins (*)