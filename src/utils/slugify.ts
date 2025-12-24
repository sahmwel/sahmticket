// utils/generateSlugs.ts
import { supabase } from "../lib/supabaseClient";

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

async function generateSlugs() {
  const { data: events } = await supabase.from('events').select('id, title');
  
  for (const event of events || []) {
    const baseSlug = slugify(event.title);
    let slug = baseSlug;
    let counter = 1;
    
    // Check for existing slugs
    while (true) {
      const { data: existing } = await supabase
        .from('events')
        .select('id')
        .eq('slug', slug)
        .neq('id', event.id)
        .single();
      
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    await supabase
      .from('events')
      .update({ slug })
      .eq('id', event.id);
    
    console.log(`Updated ${event.title} -> ${slug}`);
  }
}

// Run this once
generateSlugs();