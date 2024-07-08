/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    env: {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    },
    images: {
        domains: ['rbkvcytllqskonlalmvc.supabase.co'],
    },
};

module.exports = nextConfig;