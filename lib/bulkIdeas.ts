import { IDEA_CATEGORIES, LOCALES, type IdeaCategory, type LocalizedText } from "@/lib/content";

/**
 * Parsing and validation for bulk Bank of Ideas uploads.
 *
 * Runs in the browser so the admin sees exactly what will be written — and what
 * is wrong with it — before anything reaches Firestore. The server revalidates;
 * this is for the human, not for safety.
 */

export interface ParsedIdea {
    id: string;
    category: IdeaCategory;
    order: number;
    title: LocalizedText;
    description: LocalizedText;
    whyItHelps: LocalizedText;
    example: LocalizedText;
}

export interface ParsedRow {
    /** 1-based row number in the uploaded file, for pointing at mistakes. */
    line: number;
    idea: ParsedIdea | null;
    errors: string[];
}

/** The localized fields, and whether English is required. */
const FIELDS: { key: keyof ParsedIdea & string; required: boolean }[] = [
    { key: "title", required: true },
    { key: "description", required: true },
    { key: "whyItHelps", required: false },
    { key: "example", required: false },
];

/**
 * Splits one CSV line, honouring quoted fields and doubled quotes.
 *
 * Hand-rolled rather than pulling in a CSV library: the format here is one flat
 * row per card, and a dependency for that is not worth the bundle.
 */
function splitCsvLine(line: string): string[] {
    const cells: string[] = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (inQuotes) {
            if (char === '"') {
                if (line[i + 1] === '"') {
                    cell += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                cell += char;
            }
        } else if (char === '"') {
            inQuotes = true;
        } else if (char === ",") {
            cells.push(cell);
            cell = "";
        } else {
            cell += char;
        }
    }
    cells.push(cell);
    return cells.map((c) => c.trim());
}

/** Splits a CSV into lines, keeping newlines that sit inside quoted cells. */
function splitCsvRows(text: string): string[] {
    const rows: string[] = [];
    let row = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            inQuotes = !inQuotes;
            // Doubled quote inside a quoted cell — consume both.
            if (inQuotes === false && text[i + 1] === '"') {
                inQuotes = true;
                row += '""';
                i++;
                continue;
            }
        }
        if ((char === "\n" || char === "\r") && !inQuotes) {
            if (row.trim()) rows.push(row);
            row = "";
            // Swallow the \n of a \r\n pair.
            if (char === "\r" && text[i + 1] === "\n") i++;
            continue;
        }
        row += char;
    }
    if (row.trim()) rows.push(row);
    return rows;
}

function slugifyId(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
}

function validate(idea: Partial<ParsedIdea>, line: number): ParsedRow {
    const errors: string[] = [];

    if (!idea.id) errors.push("missing id");
    if (!idea.category) {
        errors.push("missing category");
    } else if (!IDEA_CATEGORIES.includes(idea.category)) {
        errors.push(`category must be one of ${IDEA_CATEGORIES.join(", ")}`);
    }

    for (const field of FIELDS) {
        const value = idea[field.key] as LocalizedText | undefined;
        if (field.required && !value?.en?.trim()) {
            errors.push(`${field.key}_en is required`);
        }
    }

    return {
        line,
        idea: errors.length === 0 ? (idea as ParsedIdea) : null,
        errors,
    };
}

/**
 * Reads a CSV whose header names columns as `field_locale`
 * (title_en, description_no, …) plus id, category and order.
 */
export function parseIdeasCsv(text: string): ParsedRow[] {
    const rows = splitCsvRows(text);
    if (rows.length === 0) return [];

    const header = splitCsvLine(rows[0]).map((h) => h.toLowerCase());
    const indexOf = (name: string) => header.indexOf(name);

    return rows.slice(1).map((row, i) => {
        const cells = splitCsvLine(row);
        const cell = (name: string) => {
            const index = indexOf(name);
            return index === -1 ? "" : (cells[index] || "").trim();
        };

        const idea: Partial<ParsedIdea> = {
            id: slugifyId(cell("id") || cell("title_en")),
            category: (cell("category") || "lyrics") as IdeaCategory,
            order: Number(cell("order")) || i,
            title: {},
            description: {},
            whyItHelps: {},
            example: {},
        };

        for (const field of FIELDS) {
            const bucket: LocalizedText = {};
            for (const locale of LOCALES) {
                const value = cell(`${field.key.toLowerCase()}_${locale}`);
                if (value) bucket[locale] = value;
            }
            (idea as any)[field.key] = bucket;
        }

        return validate(idea, i + 2); // +2: 1-based, and the header is line 1.
    });
}

/** Reads a JSON array of cards already shaped like the Firestore documents. */
export function parseIdeasJson(text: string): ParsedRow[] {
    let data: unknown;
    try {
        data = JSON.parse(text);
    } catch (err: any) {
        return [{ line: 1, idea: null, errors: [`Not valid JSON: ${err.message}`] }];
    }

    if (!Array.isArray(data)) {
        return [{ line: 1, idea: null, errors: ["Expected an array of cards"] }];
    }

    return data.map((raw: any, i) => {
        const asLocalized = (value: any): LocalizedText => {
            if (typeof value === "string") return { en: value };
            if (value && typeof value === "object") {
                const out: LocalizedText = {};
                LOCALES.forEach((l) => {
                    if (typeof value[l] === "string" && value[l].trim()) out[l] = value[l];
                });
                return out;
            }
            return {};
        };

        return validate(
            {
                id: slugifyId(raw?.id || asLocalized(raw?.title).en || ""),
                category: (raw?.category || "lyrics") as IdeaCategory,
                order: Number(raw?.order) || i,
                title: asLocalized(raw?.title),
                description: asLocalized(raw?.description),
                whyItHelps: asLocalized(raw?.whyItHelps),
                example: asLocalized(raw?.example),
            },
            i + 1,
        );
    });
}

export function parseIdeasFile(name: string, text: string): ParsedRow[] {
    return name.toLowerCase().endsWith(".json") ? parseIdeasJson(text) : parseIdeasCsv(text);
}

/** A CSV template with the right header and one filled example row. */
export function ideasCsvTemplate(): string {
    const header = [
        "id",
        "category",
        "order",
        ...FIELDS.flatMap((f) => LOCALES.map((l) => `${f.key.toLowerCase()}_${l}`)),
    ];

    const example = [
        "lyrics-example",
        "lyrics",
        "0",
        "Write one clear sentence about the song",
        "Skriv én tydelig setning om sangen",
        "Skriv en tydlig mening om låten",
        "Before you begin, write one sentence that explains what the song is about.",
        "",
        "",
        "It gives the lyric a clear direction from the start.",
        "",
        "",
        '"This song is about missing someone who has already moved on."',
        "",
        "",
    ];

    const escape = (cell: string) =>
        /[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;

    return `${header.join(",")}\n${example.map(escape).join(",")}\n`;
}
