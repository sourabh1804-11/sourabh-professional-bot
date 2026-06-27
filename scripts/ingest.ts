import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !GEMINI_API_KEY) {
  console.error("Missing required environment variables. Please check .env.local.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

type DocumentCategory = "resume" | "portfolio" | "linkedin" | "github" | "blog";

interface Chunk {
  content: string;
  category: DocumentCategory;
  source: string;
  metadata: Record<string, any>;
  embedding?: number[];
}

/**
 * Generates an embedding for a piece of text using Gemini's text-embedding-004.
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

/**
 * A simple semantic chunker that splits markdown files by headers and paragraphs,
 * ensuring chunks aren't too large, and preserving the section header as metadata.
 */
function chunkMarkdown(text: string, category: DocumentCategory, source: string): Chunk[] {
  const chunks: Chunk[] = [];
  const lines = text.split('\n');
  
  let currentHeader = "General";
  let currentContent: string[] = [];
  
  const saveChunk = () => {
    const textContent = currentContent.join('\n').trim();
    if (textContent.length > 50) { // Ignore very short/empty chunks
      chunks.push({
        content: `[Section: ${currentHeader}]\n${textContent}`,
        category,
        source,
        metadata: {
          section: currentHeader
        }
      });
    }
    currentContent = [];
  };

  for (const line of lines) {
    // If it's a new header, save the previous chunk and update the header
    if (line.startsWith('#')) {
      saveChunk();
      currentHeader = line.replace(/^#+\s*/, '').trim();
    } else {
      currentContent.push(line);
      
      // If the current chunk is getting too long (approx > 1500 chars ~ 300-400 tokens),
      // we can save it and start a new one to prevent context window explosion.
      if (currentContent.join('\n').length > 1500) {
        saveChunk();
      }
    }
  }
  
  // Save any remaining content
  saveChunk();
  
  return chunks;
}

/**
 * Reads all files from a directory and its subdirectories, returning their paths.
 */
function getFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, fileList);
    } else {
      if (name.endsWith(".md")) {
        fileList.push(name);
      }
    }
  }
  return fileList;
}

/**
 * Derives the document category from the file path.
 */
function getCategoryFromPath(filePath: string): DocumentCategory {
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.includes('/blogs/')) return "blog";
  if (normalized.includes('resume.md')) return "resume";
  if (normalized.includes('portfolio.md')) return "portfolio";
  if (normalized.includes('linkedin.md')) return "linkedin";
  if (normalized.includes('github.md')) return "github";
  return "portfolio"; // Default fallback
}

async function main() {
  console.log("🚀 Starting data ingestion pipeline...");
  
  const dataDir = path.join(process.cwd(), "data");
  const files = getFiles(dataDir);
  
  if (files.length === 0) {
    console.warn("⚠️ No markdown files found in the data directory.");
    return;
  }
  
  let allChunks: Chunk[] = [];
  
  // 1. Read files and chunk them
  for (const file of files) {
    console.log(`📖 Reading ${path.relative(process.cwd(), file)}...`);
    const content = fs.readFileSync(file, "utf8");
    const category = getCategoryFromPath(file);
    const source = path.basename(file);
    
    const fileChunks = chunkMarkdown(content, category, source);
    allChunks = allChunks.concat(fileChunks);
  }
  
  console.log(`🧩 Generated ${allChunks.length} chunks. Generating embeddings...`);
  
  // 2. Generate embeddings for each chunk
  // We process them in sequence to avoid rate limits on the free tier.
  for (let i = 0; i < allChunks.length; i++) {
    const chunk = allChunks[i];
    console.log(`   Embedding chunk ${i + 1}/${allChunks.length} (${chunk.category})`);
    try {
      chunk.embedding = await generateEmbedding(chunk.content);
      // Brief pause to respect API rate limits (15 RPM free tier can be strict)
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Failed to embed chunk ${i + 1}:`, error);
    }
  }
  
  const validChunks = allChunks.filter(c => c.embedding);
  console.log(`✅ Generated embeddings for ${validChunks.length} chunks. Inserting into Supabase...`);
  
  // 3. Clear existing vectors (optional, but good for idempotent runs)
  console.log("🧹 Clearing old documents from Supabase...");
  const { error: deleteError } = await supabase.from('documents').delete().neq('id', -1);
  if (deleteError) {
    console.error("❌ Failed to clear old documents:", deleteError);
  }
  
  // 4. Insert into Supabase
  for (let i = 0; i < validChunks.length; i += 50) {
    const batch = validChunks.slice(i, i + 50);
    const { error } = await supabase.from('documents').insert(
      batch.map(chunk => ({
        content: chunk.content,
        category: chunk.category,
        source: chunk.source,
        metadata: chunk.metadata,
        embedding: chunk.embedding,
      }))
    );
    
    if (error) {
      console.error("❌ Failed to insert batch:", error);
    } else {
      console.log(`📥 Inserted batch ${i / 50 + 1} (${batch.length} chunks)`);
    }
  }
  
  console.log("🎉 Ingestion complete!");
}

main().catch(console.error);
