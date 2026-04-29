/**
 * Save Note tool to store notes in local JSON file
 */

import { promises as fs } from "fs";
import { resolve } from "path";
import type { Tool, ToolInput, ToolOutput } from "./types";

const NOTES_FILE = resolve(process.cwd(), "notes.json");

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

async function loadNotes(): Promise<Note[]> {
  try {
    const data = await fs.readFile(NOTES_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveNotes(notes: Note[]): Promise<void> {
  await fs.writeFile(NOTES_FILE, JSON.stringify(notes, null, 2));
}

export const saveNoteTool: Tool = {
  name: "save_note",
  description: "Save a note to local JSON file for later review",
  input_schema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Title of the note",
      },
      content: {
        type: "string",
        description: "Content of the note",
      },
    },
    required: ["title", "content"],
  },

  async execute(input: ToolInput): Promise<ToolOutput> {
    const title = input.title as string;
    const content = input.content as string;

    if (!title) {
      return {
        success: false,
        error: "Missing required parameter: title",
      };
    }

    if (!content) {
      return {
        success: false,
        error: "Missing required parameter: content",
      };
    }

    try {
      const notes = await loadNotes();

      const newNote: Note = {
        id: `note_${Date.now()}`,
        title,
        content,
        createdAt: new Date().toISOString(),
      };

      notes.push(newNote);
      await saveNotes(notes);

      return {
        success: true,
        data: {
          id: newNote.id,
          title: newNote.title,
          createdAt: newNote.createdAt,
          totalNotes: notes.length,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
