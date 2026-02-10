const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

const db = {
    // ============ Properties ============
    async getProperties() {
        const { data, error } = await supabase
            .from('properties')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async getPropertyByName(name) {
        const { data } = await supabase
            .from('properties')
            .select('*')
            .ilike('name', `%${name}%`)
            .limit(1)
            .single();
        return data;
    },

    async addProperty(name) {
        const { data, error } = await supabase
            .from('properties')
            .insert({ name, status: 'active' })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // ============ Transactions ============
    async addTransaction({ property_id, type, amount, category, description, image_url, recorded_by }) {
        const { data, error } = await supabase
            .from('transactions')
            .insert({
                property_id,
                type,
                amount,
                category: category || (type === 'income' ? 'อื่นๆ' : 'อื่นๆ'),
                description: description || '',
                image_url: image_url || null,
                recorded_by: recorded_by || 'LINE',
                date: new Date().toISOString().slice(0, 10)
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async getTransactions(propertyId) {
        let query = supabase
            .from('transactions')
            .select('*, properties(name)')
            .order('created_at', { ascending: false });

        if (propertyId) {
            query = query.eq('property_id', propertyId);
        }
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async getSummary(propertyId) {
        let transactions;
        if (propertyId) {
            transactions = await this.getTransactions(propertyId);
        } else {
            transactions = await this.getTransactions();
        }

        let totalIncome = 0;
        let totalExpense = 0;
        const categories = {};

        transactions.forEach(t => {
            const amt = parseFloat(t.amount) || 0;
            if (t.type === 'income') {
                totalIncome += amt;
            } else {
                totalExpense += amt;
                categories[t.category] = (categories[t.category] || 0) + amt;
            }
        });

        return {
            totalIncome,
            totalExpense,
            profit: totalIncome - totalExpense,
            count: transactions.length,
            categories,
            recent: transactions.slice(0, 5)
        };
    },

    // ============ Pending Images ============
    async savePendingImage(userId, imageUrl) {
        const { data, error } = await supabase
            .from('pending_images')
            .upsert({
                user_id: userId,
                image_url: imageUrl,
                status: 'waiting',
                created_at: new Date().toISOString()
            }, { onConflict: 'user_id' })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async getPendingImage(userId) {
        const { data } = await supabase
            .from('pending_images')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'waiting')
            .single();
        return data;
    },

    async clearPendingImage(userId) {
        await supabase
            .from('pending_images')
            .delete()
            .eq('user_id', userId);
    },

    // ============ Dashboard API ============
    async getDashboardData() {
        const properties = await this.getProperties();
        const transactions = await this.getTransactions();

        let totalIncome = 0;
        let totalExpense = 0;
        const categoryTotals = {};

        const propertyData = properties.map(p => {
            const propTx = transactions.filter(t => t.property_id === p.id);
            let income = 0, expense = 0;
            propTx.forEach(t => {
                const amt = parseFloat(t.amount) || 0;
                if (t.type === 'income') income += amt;
                else {
                    expense += amt;
                    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amt;
                }
            });
            return { ...p, income, expense, profit: income - expense, txCount: propTx.length };
        });

        transactions.forEach(t => {
            const amt = parseFloat(t.amount) || 0;
            if (t.type === 'income') totalIncome += amt;
            else totalExpense += amt;
        });

        return {
            totalIncome,
            totalExpense,
            profit: totalIncome - totalExpense,
            totalProperties: properties.length,
            totalTransactions: transactions.length,
            properties: propertyData,
            recentTransactions: transactions.slice(0, 10),
            categoryTotals
        };
    }
};

module.exports = db;
