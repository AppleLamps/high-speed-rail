import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

async function initializeDatabase() {
    const sql = neon(process.env.DATABASE_URL);

    console.log('Initializing database...');

    try {
        // Create spending_snapshots table
        await sql`
            CREATE TABLE IF NOT EXISTS spending_snapshots (
                id SERIAL PRIMARY KEY,
                amount_spent NUMERIC NOT NULL,
                recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `;
        console.log('✓ Created spending_snapshots table');

        // Create poll_votes table
        await sql`
            CREATE TABLE IF NOT EXISTS poll_votes (
                id SERIAL PRIMARY KEY,
                vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('up', 'down')),
                voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `;
        console.log('✓ Created poll_votes table');

        console.log('\n✅ Database initialized successfully!');
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
}

initializeDatabase();
