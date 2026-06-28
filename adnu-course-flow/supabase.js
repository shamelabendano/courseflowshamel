// supabase.js — creates and exports the Supabase client
// Credentials: Supabase Dashboard → Project Settings → API

const { createClient } = require('@supabase/supabase-js');

// Nag send na akong invite sa emails nindo btw.

const SUPABASE_URL = 'https://wbfpaonqnpncqwczbjga.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xNzMXTbWuRNQxYDgIHtrfg_jHSXzo3_';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = supabase;
