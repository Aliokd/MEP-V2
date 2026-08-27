#!/usr/bin/env node
/**
 * Seeds the SEO guide pages into the Pages CMS as DRAFTS.
 *
 *   node scripts/seed-seo-pages.mjs            # dry run — prints what would be written
 *   node scripts/seed-seo-pages.mjs --commit   # writes to Firestore (as drafts)
 *
 * Each page targets one keyword cluster ("how to write a song", "songwriting
 * for beginners", "chord progressions", "how to finish a song") in en/no/sv.
 * They are seeded with status "draft" on purpose: an editor reviews the voice,
 * tightens wording, and publishes from the admin console — publishing is what
 * puts a page in the sitemap and fires the IndexNow ping, so nothing here goes
 * live by running this script.
 *
 * Safe to re-run: an existing document is never overwritten (no --force here —
 * these pages are meant to be edited by humans after seeding, and a re-run must
 * not eat those edits).
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS.
 */
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const commit = process.argv.includes("--commit");

if (getApps().length === 0) {
    initializeApp({
        credential: applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID || "mep-v2",
    });
}
const db = getFirestore();

const PAGES = [
    {
        slug: "how-to-write-a-song",
        order: 100,
        title: {
            en: "How to Write a Song: A Practical Guide",
            no: "Hvordan skrive en sang: en praktisk guide",
            sv: "Hur man skriver en låt: en praktisk guide",
        },
        description: {
            en: "A step-by-step guide to writing a song — finding an idea, shaping lyrics and melody, choosing chords, and finishing what you start.",
            no: "En trinnvis guide til å skrive en sang — finne en idé, forme tekst og melodi, velge akkorder, og fullføre det du starter på.",
            sv: "En steg-för-steg-guide till att skriva en låt — hitta en idé, forma text och melodi, välja ackord, och göra klart det du påbörjar.",
        },
        body: {
            en: `Every songwriter starts the same way: with nothing. A blank page, maybe a feeling. The difference between people who write songs and people who *want* to write songs is rarely talent — it's having a process that carries you from that blank page to a finished piece. Here is one that works.

## 1. Start with one true thing

A song is not about everything. It's about one thing. A sentence someone said to you, a moment you can't shake, a question you keep asking. Write that one thing down in plain language before you try to make it poetic. "I stayed too long in something that was over" is a song. "Life is a journey" is not — it's every song, which means it's none.

## 2. Talk before you sing

Say your idea out loud in ordinary words, as if explaining it to a friend. The phrases you naturally use are more honest than the ones you'd invent at a desk — and honest phrasing is what makes listeners believe you. Many professionals keep a running note of these spoken fragments; half of a good lyric is usually already in there.

## 3. Find the chorus first

The chorus is the sentence you'd want a stranger to remember. If your one true thing fits in a line you can imagine a room singing back, you have a chorus seed. Build it on the strongest, simplest words you have. Verses explain; the chorus *feels*. If you're stuck, hum a melody over two or three chords and let nonsense syllables find the rhythm before the words do.

## 4. Let the verses do their job

A verse answers the questions the chorus raises: who, where, what happened. Verse one sets the scene. Verse two moves the story or deepens it — never just repeats it in different clothes. Concrete details beat abstract feelings every time: the coat left on the chair says more than "I miss you" ever will.

## 5. Keep the music simple enough to serve the song

Thousands of great songs use three or four chords. Pick a progression that matches the feeling — and then stop shopping for chords. The song lives in the melody and the words; harmony is the floor it stands on, not the furniture. If you want to go deeper here, see our guide to [chord progressions for songwriting](/chord-progressions-for-songwriting).

## 6. Finish ugly, then fix it

The single biggest killer of songs is the wait for the perfect line. Write a bad bridge. Sing a placeholder lyric. A finished bad draft can be repaired in an afternoon; an unfinished perfect fragment stays a fragment forever. Most professional songwriters finish far more songs than they release — finishing is the skill, and it's trainable. We wrote more about this in [how to finish a song](/how-to-finish-a-song).

## 7. Sleep on it, then cut

Come back tomorrow and read the lyric cold. Cut every line that explains what another line already shows. If a verse can go without the song collapsing, it goes. Shorter songs are almost always stronger songs.

---

Writing songs is a craft, and crafts are learned by doing — with feedback, structure, and repetition. That's exactly what Veinote is built for: a place to write, tools that help when you're stuck, lessons from professionals who've done it for decades, and a community that finishes things. [Join the waiting list](/waiting-list) to be there when we open.`,
            no: `Alle låtskrivere starter på samme sted: med ingenting. Et blankt ark, kanskje en følelse. Forskjellen på folk som skriver sanger og folk som *vil* skrive sanger, er sjelden talent — det er å ha en prosess som bærer deg fra det blanke arket til et ferdig verk. Her er en som fungerer.

## 1. Start med én sann ting

En sang handler ikke om alt. Den handler om én ting. En setning noen sa til deg, et øyeblikk du ikke blir kvitt, et spørsmål du stadig stiller. Skriv ned den ene tingen i vanlige ord før du prøver å gjøre den poetisk. «Jeg ble for lenge i noe som var over» er en sang. «Livet er en reise» er det ikke — det er alle sanger, og dermed ingen.

## 2. Snakk før du synger

Si ideen din høyt med hverdagslige ord, som om du forklarer den til en venn. Frasene du bruker naturlig er ærligere enn dem du finner opp ved et skrivebord — og ærlige formuleringer er det som får lytteren til å tro på deg. Mange profesjonelle har et løpende notat med slike muntlige fragmenter; halvparten av en god tekst ligger som regel allerede der.

## 3. Finn refrenget først

Refrenget er setningen du vil at en fremmed skal huske. Hvis din ene sanne ting får plass i en linje du kan se for deg at et helt rom synger tilbake, har du et refrengfrø. Bygg det på de sterkeste, enkleste ordene du har. Versene forklarer; refrenget *føles*. Står du fast, nynn en melodi over to–tre akkorder og la tullestavelser finne rytmen før ordene gjør det.

## 4. La versene gjøre jobben sin

Et vers svarer på spørsmålene refrenget stiller: hvem, hvor, hva skjedde. Første vers setter scenen. Andre vers driver historien videre eller gjør den dypere — aldri bare gjentar den i nye klær. Konkrete detaljer slår abstrakte følelser hver gang: jakken som ble igjen på stolen sier mer enn «jeg savner deg» noen gang vil.

## 5. Hold musikken enkel nok til å tjene sangen

Tusenvis av gode sanger bruker tre eller fire akkorder. Velg en progresjon som matcher følelsen — og slutt så å lete etter flere akkorder. Sangen bor i melodien og ordene; harmonikken er gulvet den står på, ikke møblene. Vil du gå dypere, les guiden vår om [akkordprogresjoner for låtskriving](/no/chord-progressions-for-songwriting).

## 6. Gjør ferdig stygt, og fiks det etterpå

Den største sangdreperen er ventingen på den perfekte linjen. Skriv en dårlig bro. Syng en midlertidig tekst. Et ferdig dårlig utkast kan repareres på en ettermiddag; et uferdig perfekt fragment forblir et fragment for alltid. De fleste profesjonelle låtskrivere fullfører langt flere sanger enn de gir ut — fullføring er ferdigheten, og den kan trenes. Vi har skrevet mer om dette i [hvordan fullføre en sang](/no/how-to-finish-a-song).

## 7. Sov på det, og kutt

Kom tilbake i morgen og les teksten med friske øyne. Kutt hver linje som forklarer det en annen linje allerede viser. Kan et vers fjernes uten at sangen kollapser, skal det bort. Kortere sanger er nesten alltid sterkere sanger.

---

Å skrive sanger er et håndverk, og håndverk læres ved å gjøre — med tilbakemeldinger, struktur og repetisjon. Det er akkurat det Veinote er bygget for: et sted å skrive, verktøy som hjelper når du står fast, leksjoner fra profesjonelle med tiår bak seg, og et fellesskap som fullfører ting. [Sett deg på ventelisten](/no/waiting-list) så er du med når vi åpner.`,
            sv: `Alla låtskrivare börjar på samma ställe: med ingenting. Ett tomt papper, kanske en känsla. Skillnaden mellan de som skriver låtar och de som *vill* skriva låtar är sällan talang — det är att ha en process som bär dig från det tomma papperet till ett färdigt verk. Här är en som fungerar.

## 1. Börja med en sann sak

En låt handlar inte om allt. Den handlar om en sak. En mening någon sa till dig, ett ögonblick du inte blir av med, en fråga du ständigt ställer. Skriv ner den saken med vanliga ord innan du försöker göra den poetisk. »Jag stannade för länge i något som var över« är en låt. »Livet är en resa« är det inte — det är alla låtar, och därmed ingen.

## 2. Prata innan du sjunger

Säg din idé högt med vardagliga ord, som om du förklarade den för en vän. Fraserna du använder naturligt är ärligare än de du hittar på vid ett skrivbord — och ärliga formuleringar är det som får lyssnaren att tro på dig. Många proffs har en löpande anteckning med sådana talade fragment; halva texten till en bra låt ligger oftast redan där.

## 3. Hitta refrängen först

Refrängen är meningen du vill att en främling ska minnas. Om din enda sanna sak ryms i en rad du kan föreställa dig att ett helt rum sjunger tillbaka, har du ett refrängfrö. Bygg den på de starkaste, enklaste orden du har. Verserna förklarar; refrängen *känns*. Kör du fast, nynna en melodi över två–tre ackord och låt nonsensstavelser hitta rytmen innan orden gör det.

## 4. Låt verserna göra sitt jobb

En vers svarar på frågorna refrängen ställer: vem, var, vad hände. Första versen sätter scenen. Andra versen för berättelsen vidare eller fördjupar den — aldrig bara upprepar den i nya kläder. Konkreta detaljer slår abstrakta känslor varje gång: jackan som blev kvar på stolen säger mer än »jag saknar dig« någonsin kommer att göra.

## 5. Håll musiken enkel nog att tjäna låten

Tusentals bra låtar använder tre eller fyra ackord. Välj en progression som matchar känslan — och sluta sedan leta efter fler ackord. Låten bor i melodin och orden; harmoniken är golvet den står på, inte möblerna. Vill du gå djupare, läs vår guide om [ackordprogressioner för låtskrivande](/sv/chord-progressions-for-songwriting).

## 6. Gör klart fult, och laga sedan

Den största låtdödaren är väntan på den perfekta raden. Skriv ett dåligt stick. Sjung en tillfällig text. Ett färdigt dåligt utkast kan repareras på en eftermiddag; ett ofärdigt perfekt fragment förblir ett fragment för alltid. De flesta professionella låtskrivare gör klart betydligt fler låtar än de släpper — att göra klart är färdigheten, och den går att träna. Vi har skrivit mer om detta i [hur man gör klar en låt](/sv/how-to-finish-a-song).

## 7. Sov på saken, och stryk

Kom tillbaka i morgon och läs texten med fräscha ögon. Stryk varje rad som förklarar det en annan rad redan visar. Kan en vers tas bort utan att låten faller ihop, ska den bort. Kortare låtar är nästan alltid starkare låtar.

---

Att skriva låtar är ett hantverk, och hantverk lärs genom att göra — med återkoppling, struktur och upprepning. Det är precis vad Veinote är byggt för: en plats att skriva på, verktyg som hjälper när du kör fast, lektioner från proffs med decennier bakom sig, och en gemenskap som gör klart saker. [Ställ dig på väntelistan](/sv/waiting-list) så är du med när vi öppnar.`,
        },
    },
    {
        slug: "songwriting-for-beginners",
        order: 101,
        title: {
            en: "Songwriting for Beginners: Where to Actually Start",
            no: "Låtskriving for nybegynnere: hvor du faktisk begynner",
            sv: "Låtskrivande för nybörjare: var du faktiskt börjar",
        },
        description: {
            en: "No music theory, no gear, no experience — what a beginner songwriter actually needs to write a first song, and the traps to skip.",
            no: "Ingen musikkteori, intet utstyr, ingen erfaring — hva en nybegynner faktisk trenger for å skrive sin første sang, og fellene du bør hoppe over.",
            sv: "Ingen musikteori, ingen utrustning, ingen erfarenhet — vad en nybörjare faktiskt behöver för att skriva sin första låt, och fällorna att hoppa över.",
        },
        body: {
            en: `You don't need a music degree, a studio, or an expensive guitar to write songs. Some of the most recorded songwriters in history can't read notation. What you need is much smaller and much harder: the willingness to write badly for a while. Here's what actually matters in your first months.

## What you need (and what you don't)

**You need:** something to capture ideas (your phone), fifteen minutes of privacy, and one instrument you can make three chords on — or none at all, if you write melodies with your voice.

**You don't need:** theory, perfect pitch, recording equipment, or permission. Beginners lose months "preparing" to write instead of writing. Preparation is procrastination wearing a nicer jacket.

## Copy before you create

Every craft starts with imitation. Take a song you love and study it like a mechanic: how many lines in the verse? Where does the chorus land? What is the very first image? Then write your own song *into that shape* with your own words and story. This isn't cheating — it's how painters, novelists and songwriters have always learned. The shape is borrowed; the life inside it is yours.

## Write small songs about small things

A beginner's most common mistake is aiming at the biggest possible subject — love itself, life itself, loss itself. Professionals aim smaller: not "heartbreak" but the drive home after the last conversation. Small and specific is what big feelings actually look like up close. If you can name the street, you're close.

## Ten bad songs beat one perfect one

Your first songs will be clumsy. That is not a signal to stop — it's the price of admission everyone pays, including everyone you admire. Set a humble quota: one small finished song a week, however rough. Finishing is a muscle, and it grows faster than talent. Our guide on [how to finish a song](/how-to-finish-a-song) goes deeper on this.

## Learn three chords, then write for a month

Harmony can wait. Three chords — try G, C and D, or the minor mood of Am, F and C — will carry you through dozens of songs. When those start to feel small, our guide to [chord progressions for songwriting](/chord-progressions-for-songwriting) is the natural next step. Ready for the full process? Start with [how to write a song](/how-to-write-a-song).

## Play it for one person

Not the internet. One person whose taste you trust. Watch where they lean in and where they drift. That single data point teaches you more than a hundred anonymous comments — and it builds the habit that separates growing writers from stuck ones: letting the song be heard.

---

Veinote was built for exactly this stage: structured lessons that assume no theory, writing tools that suggest rhymes and chords when you're stuck, exercises that build the finishing muscle, and a community of people writing their first songs too. [Join the waiting list](/waiting-list) — the early group gets in first.`,
            no: `Du trenger ingen musikkutdanning, intet studio og ingen dyr gitar for å skrive sanger. Noen av historiens mest innspilte låtskrivere kan ikke lese noter. Det du trenger er mye mindre og mye vanskeligere: viljen til å skrive dårlig en stund. Her er det som faktisk betyr noe de første månedene.

## Hva du trenger (og hva du ikke trenger)

**Du trenger:** noe å fange ideer med (telefonen din), et kvarter i fred, og ett instrument du kan ta tre akkorder på — eller ingen, hvis du lager melodier med stemmen.

**Du trenger ikke:** teori, perfekt gehør, opptaksutstyr eller tillatelse. Nybegynnere mister måneder på å «forberede seg» på å skrive i stedet for å skrive. Forberedelse er utsettelse i penere jakke.

## Kopier før du skaper

Alt håndverk starter med imitasjon. Ta en sang du elsker og studer den som en mekaniker: hvor mange linjer i verset? Hvor lander refrenget? Hva er det aller første bildet? Skriv så din egen sang *inn i den formen* med dine egne ord og din egen historie. Dette er ikke juks — det er slik malere, forfattere og låtskrivere alltid har lært. Formen er lånt; livet inni er ditt.

## Skriv små sanger om små ting

Nybegynnerens vanligste feil er å sikte på det størst mulige temaet — kjærligheten selv, livet selv, tapet selv. Profesjonelle sikter mindre: ikke «hjertesorg», men kjøreturen hjem etter den siste samtalen. Smått og spesifikt er hvordan store følelser faktisk ser ut på nært hold. Kan du navngi gaten, er du nære.

## Ti dårlige sanger slår én perfekt

De første sangene dine blir klønete. Det er ikke et signal om å stoppe — det er inngangsbilletten alle betaler, inkludert alle du ser opp til. Sett en beskjeden kvote: én liten ferdig sang i uken, uansett hvor røff. Fullføring er en muskel, og den vokser raskere enn talent. Guiden vår om [hvordan fullføre en sang](/no/how-to-finish-a-song) går dypere inn i dette.

## Lær tre akkorder, og skriv i en måned

Harmonikken kan vente. Tre akkorder — prøv G, C og D, eller moll-stemningen i Am, F og C — bærer deg gjennom dusinvis av sanger. Når de begynner å føles små, er guiden vår om [akkordprogresjoner for låtskriving](/no/chord-progressions-for-songwriting) det naturlige neste steget. Klar for hele prosessen? Start med [hvordan skrive en sang](/no/how-to-write-a-song).

## Spill den for én person

Ikke internett. Én person hvis smak du stoler på. Se hvor de lener seg frem og hvor de faller av. Det ene datapunktet lærer deg mer enn hundre anonyme kommentarer — og det bygger vanen som skiller låtskrivere i vekst fra dem som står fast: å la sangen bli hørt.

---

Veinote er bygget for akkurat denne fasen: strukturerte leksjoner som ikke forutsetter teori, skriveverktøy som foreslår rim og akkorder når du står fast, øvelser som bygger fullføringsmuskelen, og et fellesskap av folk som også skriver sine første sanger. [Sett deg på ventelisten](/no/waiting-list) — de første slipper inn først.`,
            sv: `Du behöver ingen musikutbildning, ingen studio och ingen dyr gitarr för att skriva låtar. Några av historiens mest inspelade låtskrivare kan inte läsa noter. Det du behöver är mycket mindre och mycket svårare: viljan att skriva dåligt ett tag. Här är det som faktiskt spelar roll de första månaderna.

## Vad du behöver (och vad du inte behöver)

**Du behöver:** något att fånga idéer med (din telefon), en kvart i fred, och ett instrument du kan ta tre ackord på — eller inget alls, om du skriver melodier med rösten.

**Du behöver inte:** teori, perfekt gehör, inspelningsutrustning eller tillåtelse. Nybörjare förlorar månader på att »förbereda sig« för att skriva i stället för att skriva. Förberedelse är prokrastinering i finare jacka.

## Kopiera innan du skapar

Allt hantverk börjar med imitation. Ta en låt du älskar och studera den som en mekaniker: hur många rader i versen? Var landar refrängen? Vad är den allra första bilden? Skriv sedan din egen låt *in i den formen* med dina egna ord och din egen historia. Det är inte fusk — det är så målare, författare och låtskrivare alltid har lärt sig. Formen är lånad; livet inuti är ditt.

## Skriv små låtar om små saker

Nybörjarens vanligaste misstag är att sikta på största möjliga ämne — kärleken själv, livet självt, förlusten själv. Proffs siktar mindre: inte »hjärtesorg«, utan bilresan hem efter det sista samtalet. Smått och specifikt är hur stora känslor faktiskt ser ut på nära håll. Kan du namnge gatan är du nära.

## Tio dåliga låtar slår en perfekt

Dina första låtar blir klumpiga. Det är inte en signal att sluta — det är inträdesbiljetten alla betalar, inklusive alla du ser upp till. Sätt en blygsam kvot: en liten färdig låt i veckan, hur grov den än är. Att göra klart är en muskel, och den växer snabbare än talang. Vår guide om [hur man gör klar en låt](/sv/how-to-finish-a-song) går djupare in på detta.

## Lär dig tre ackord, och skriv i en månad

Harmoniken kan vänta. Tre ackord — prova G, C och D, eller mollstämningen i Am, F och C — bär dig genom dussintals låtar. När de börjar kännas små är vår guide om [ackordprogressioner för låtskrivande](/sv/chord-progressions-for-songwriting) det naturliga nästa steget. Redo för hela processen? Börja med [hur man skriver en låt](/sv/how-to-write-a-song).

## Spela den för en person

Inte internet. En person vars smak du litar på. Se var de lutar sig fram och var de tappar intresset. Den enda datapunkten lär dig mer än hundra anonyma kommentarer — och den bygger vanan som skiljer växande låtskrivare från fastnade: att låta låten höras.

---

Veinote är byggt för precis det här stadiet: strukturerade lektioner som inte förutsätter teori, skrivverktyg som föreslår rim och ackord när du kör fast, övningar som bygger färdigställandemuskeln, och en gemenskap av människor som också skriver sina första låtar. [Ställ dig på väntelistan](/sv/waiting-list) — de första släpps in först.`,
        },
    },
    {
        slug: "chord-progressions-for-songwriting",
        order: 102,
        title: {
            en: "Chord Progressions for Songwriting: The Ones That Work",
            no: "Akkordprogresjoner for låtskriving: de som fungerer",
            sv: "Ackordprogressioner för låtskrivande: de som fungerar",
        },
        description: {
            en: "The chord progressions behind thousands of songs — I–V–vi–IV and friends — what each one feels like, and how to make a familiar progression sound like yours.",
            no: "Akkordprogresjonene bak tusenvis av sanger — I–V–vi–IV og vennene deres — hva hver av dem føles som, og hvordan du får en kjent progresjon til å låte som din.",
            sv: "Ackordprogressionerna bakom tusentals låtar — I–V–vi–IV och vännerna — vad var och en känns som, och hur du får en bekant progression att låta som din.",
        },
        body: {
            en: `Chord progressions are the most borrowed material in music — and that's fine. Progressions aren't copyrightable, and the same four chords have carried punk anthems, country ballads and pop hits without anyone noticing the family resemblance. What matters is knowing what each progression *feels* like, so you can pick the right floor for the song to stand on.

A quick note on the numbers: musicians name chords by their position in the key. In C major, I = C, IV = F, V = G, vi = Am. The pattern is what matters — you can move any progression to any key.

## I–V–vi–IV — the workhorse

*In C: C – G – Am – F.* Uplift with a shadow in it. This is the most used progression in modern pop for a reason: it rises, falls into the relative minor, and resolves warm. If your song is about hope with a cost, start here.

## vi–IV–I–V — the same chords, turned sad

*In C: Am – F – C – G.* Identical chords, different starting point, completely different feeling — it leads with the minor, so the whole loop carries longing. Countless ballads live here.

## I–IV–V — three chords and the truth

*In C: C – F – G.* Folk, blues, country, early rock. Direct, honest, zero pretension. When the words carry the weight, this progression stays out of the way.

## ii–V–I — the storyteller's resolve

*In C: Dm – G – C.* The backbone of jazz, but also the smoothest way home in any genre. Use it at the end of a chorus when you want resolution to feel earned.

## I–vi–IV–V — the doo-wop heart

*In C: C – Am – F – G.* Nostalgia in chord form. Every 50s slow dance, and still underneath modern songs that want that innocence.

## How to make a borrowed progression yours

The progression is the least distinctive part of a song, and there are honest ways to make it your own: change the rhythm you strum or play it with, let the melody land on unexpected chord tones, hold one chord twice as long as expected, or drop an instrument out entirely for a section. The chords are the canvas — nobody hangs a painting and admires the linen.

## When to break the pattern

If every section of your song uses the same four chords, the chorus has nowhere to lift. The cheapest trick with the biggest payoff: change *one* chord in the chorus, or start the chorus on a different chord than the verse. Contrast, not complexity, is what ears register as movement. For where chords fit in the bigger picture, see [how to write a song](/how-to-write-a-song).

---

Inside Veinote, chord suggestions live next to your lyrics — pick a mood and hear progressions that match, then bend them until they're yours. [Join the waiting list](/waiting-list) to try it when we open.`,
            no: `Akkordprogresjoner er det mest lånte materialet i musikken — og det er helt greit. Progresjoner kan ikke opphavsrettsbeskyttes, og de samme fire akkordene har båret punklåter, countryballader og popslagere uten at noen la merke til slektskapet. Det som betyr noe, er å vite hva hver progresjon *føles* som, så du kan velge riktig gulv for sangen å stå på.

En rask forklaring på tallene: musikere navngir akkorder etter plassen deres i tonearten. I C-dur er I = C, IV = F, V = G, vi = Am. Det er mønsteret som teller — du kan flytte enhver progresjon til enhver toneart.

## I–V–vi–IV — arbeidshesten

*I C: C – G – Am – F.* Løft med en skygge i seg. Dette er den mest brukte progresjonen i moderne pop av en grunn: den stiger, faller inn i mollparallellen og lander varmt. Handler sangen din om håp med en kostnad, start her.

## vi–IV–I–V — samme akkorder, snudd trist

*I C: Am – F – C – G.* Identiske akkorder, annet startpunkt, helt annen følelse — den leder med moll, så hele runden bærer lengsel. Utallige ballader bor her.

## I–IV–V — tre akkorder og sannheten

*I C: C – F – G.* Folk, blues, country, tidlig rock. Direkte, ærlig, null pretensjon. Når ordene bærer vekten, holder denne progresjonen seg unna veien.

## ii–V–I — fortellerens hjemkomst

*I C: Dm – G – C.* Ryggraden i jazz, men også den mykeste veien hjem i enhver sjanger. Bruk den på slutten av et refreng når forløsningen skal føles fortjent.

## I–vi–IV–V — doo-wop-hjertet

*I C: C – Am – F – G.* Nostalgi i akkordform. Hver eneste 50-tallsslowdans, og fortsatt under moderne sanger som vil ha den uskylden.

## Slik gjør du en lånt progresjon til din

Progresjonen er den minst særegne delen av en sang, og det finnes ærlige måter å gjøre den til din egen på: endre rytmen du spiller den med, la melodien lande på uventede akkordtoner, hold én akkord dobbelt så lenge som forventet, eller ta bort et instrument helt i en seksjon. Akkordene er lerretet — ingen henger opp et maleri og beundrer lerretsstoffet.

## Når du bør bryte mønsteret

Hvis hver del av sangen bruker de samme fire akkordene, har refrenget ingen steder å løfte seg. Det billigste trikset med størst gevinst: endre *én* akkord i refrenget, eller start refrenget på en annen akkord enn verset. Kontrast, ikke kompleksitet, er det ørene registrerer som bevegelse. For hvor akkordene passer inn i det større bildet, se [hvordan skrive en sang](/no/how-to-write-a-song).

---

I Veinote bor akkordforslagene ved siden av teksten din — velg en stemning og hør progresjoner som passer, og bøy dem så til de blir dine. [Sett deg på ventelisten](/no/waiting-list) for å prøve når vi åpner.`,
            sv: `Ackordprogressioner är musikens mest lånade material — och det är helt okej. Progressioner kan inte upphovsrättsskyddas, och samma fyra ackord har burit punklåtar, countryballader och pophits utan att någon märkt släktskapet. Det som spelar roll är att veta vad varje progression *känns* som, så att du kan välja rätt golv för låten att stå på.

En snabb förklaring av siffrorna: musiker namnger ackord efter deras plats i tonarten. I C-dur är I = C, IV = F, V = G, vi = Am. Det är mönstret som räknas — du kan flytta vilken progression som helst till vilken tonart som helst.

## I–V–vi–IV — arbetshästen

*I C: C – G – Am – F.* Lyft med en skugga i sig. Det här är den mest använda progressionen i modern pop av en anledning: den stiger, faller in i mollparallellen och landar varmt. Handlar din låt om hopp med ett pris, börja här.

## vi–IV–I–V — samma ackord, vänt sorgset

*I C: Am – F – C – G.* Identiska ackord, annan startpunkt, helt annan känsla — den leder med moll, så hela slingan bär längtan. Otaliga ballader bor här.

## I–IV–V — tre ackord och sanningen

*I C: C – F – G.* Folk, blues, country, tidig rock. Direkt, ärligt, noll pretention. När orden bär tyngden håller den här progressionen sig ur vägen.

## ii–V–I — berättarens hemkomst

*I C: Dm – G – C.* Ryggraden i jazz, men också den mjukaste vägen hem i vilken genre som helst. Använd den i slutet av en refräng när upplösningen ska kännas förtjänad.

## I–vi–IV–V — doo-wop-hjärtat

*I C: C – Am – F – G.* Nostalgi i ackordform. Varje 50-talsslowdans, och fortfarande under moderna låtar som vill åt den oskulden.

## Så gör du en lånad progression till din

Progressionen är den minst särpräglade delen av en låt, och det finns ärliga sätt att göra den till din egen: ändra rytmen du spelar den med, låt melodin landa på oväntade ackordtoner, håll ett ackord dubbelt så länge som väntat, eller ta bort ett instrument helt i en sektion. Ackorden är duken — ingen hänger upp en målning och beundrar linneväven.

## När du ska bryta mönstret

Om varje del av din låt använder samma fyra ackord har refrängen ingenstans att lyfta. Det billigaste tricket med störst utdelning: ändra *ett* ackord i refrängen, eller börja refrängen på ett annat ackord än versen. Kontrast, inte komplexitet, är vad öronen registrerar som rörelse. För var ackorden passar in i helheten, se [hur man skriver en låt](/sv/how-to-write-a-song).

---

I Veinote bor ackordförslagen bredvid din text — välj en stämning och hör progressioner som passar, och böj dem sedan tills de är dina. [Ställ dig på väntelistan](/sv/waiting-list) för att prova när vi öppnar.`,
        },
    },
    {
        slug: "how-to-finish-a-song",
        order: 103,
        title: {
            en: "How to Finish a Song (When You Always Get Stuck Halfway)",
            no: "Hvordan fullføre en sang (når du alltid står fast halvveis)",
            sv: "Hur man gör klar en låt (när du alltid fastnar halvvägs)",
        },
        description: {
            en: "Most songwriters never finish their songs. The reasons are predictable — and fixable. A practical system for getting from promising fragment to finished song.",
            no: "De fleste låtskrivere fullfører aldri sangene sine. Grunnene er forutsigbare — og mulige å fikse. Et praktisk system for å komme fra lovende fragment til ferdig sang.",
            sv: "De flesta låtskrivare gör aldrig klart sina låtar. Orsakerna är förutsägbara — och går att åtgärda. Ett praktiskt system för att ta sig från lovande fragment till färdig låt.",
        },
        body: {
            en: `The graveyard of songwriting isn't bad songs — it's half songs. A verse and a hook from last spring. Forty voice memos titled "idea". Research on musicians suggests the overwhelming majority of started songs never get finished. The good news: unfinished songs almost always die from the same few causes, and every one of them has a practical fix.

## Why songs die at the halfway point

**The inspiration that started the song runs out.** The first verse wrote itself; the second one won't. This is normal — the opening came from a feeling, and feelings don't take requests. The rest of the song is craft, and treating that shift as failure is the number one killer.

**The standard rises mid-song.** Your fragment sounds wonderful *as a fragment*, because imagination fills in the rest with something perfect. Every concrete line you add competes with an imagined line that doesn't exist. Writers who understand this finish; writers who don't keep polishing bar one.

**There's no deadline and no listener.** A song nobody is waiting for can stay unfinished forever at zero cost. Deadlines feel unromantic, and they have finished more songs than inspiration ever has.

## The system

**1. Separate writing from judging.** Never edit during a writing session. Get to the end — with placeholder lines, wrong rhymes, a hummed bridge — before you evaluate anything. You can't steer a parked car.

**2. Book the second session before ending the first.** The moment you stop, write down tomorrow's first move: "rewrite verse two, line three." An open loop with a named next step reopens easily; a memo titled "idea" never does.

**3. Impose a structure early.** Deciding "verse, chorus, verse, chorus, bridge, chorus" turns an infinite problem into a fill-in-the-blanks problem. You can renegotiate the map later — but you can't walk without one. Our [guide to writing a song](/how-to-write-a-song) covers picking a structure in more depth.

**4. Give the song a deadline with a witness.** Tell one person they'll hear it Friday. Not the internet — one person. The mild social pressure of a promised listen does what willpower won't.

**5. Declare it finished, then let it rest.** Finished doesn't mean perfect; it means performable start to end. Sing it through, record a rough take on your phone, and stop. Two weeks later you'll hear exactly what to improve — and you'll be hearing a *song*, not a wound.

## The mindset shift

Professionals don't finish songs because their ideas are better. They finish because they've stopped negotiating with each song about whether it deserves to exist. Quantity isn't the enemy of quality in songwriting — it's the road to it. Nobody writes their hundredth song without writing their thirtieth, and the thirtieth only exists if the fourth got finished, ugly, on a Tuesday.

---

This problem is the reason Veinote exists. The whole platform — the writing tools, the exercises, the structure, the community — is built around one promise: you'll finish your songs. [Join the waiting list](/waiting-list) and start finishing.`,
            no: `Låtskrivingens kirkegård er ikke dårlige sanger — det er halve sanger. Et vers og en hook fra i fjor vår. Førti taleopptak med tittelen «idé». Forskning på musikere tyder på at det store flertallet av påbegynte sanger aldri blir ferdige. Den gode nyheten: uferdige sanger dør nesten alltid av de samme få årsakene, og hver av dem har en praktisk løsning.

## Hvorfor sanger dør halvveis

**Inspirasjonen som startet sangen tar slutt.** Første vers skrev seg selv; det andre nekter. Dette er normalt — åpningen kom fra en følelse, og følelser tar ikke imot bestillinger. Resten av sangen er håndverk, og å behandle det skiftet som fiasko er drapsårsak nummer én.

**Standarden stiger midt i sangen.** Fragmentet ditt låter nydelig *som fragment*, fordi fantasien fyller inn resten med noe perfekt. Hver konkrete linje du legger til konkurrerer med en innbilt linje som ikke finnes. De som forstår dette, blir ferdige; de som ikke gjør det, pusser på takt én for alltid.

**Det finnes ingen frist og ingen lytter.** En sang ingen venter på kan forbli uferdig for alltid, helt gratis. Frister føles uromantiske, og de har fullført flere sanger enn inspirasjonen noen gang har.

## Systemet

**1. Skill skriving fra dømming.** Rediger aldri i en skriveøkt. Kom deg til slutten — med midlertidige linjer, feil rim, en nynnet bro — før du vurderer noe som helst. Du kan ikke styre en parkert bil.

**2. Book neste økt før du avslutter denne.** I det øyeblikket du stopper, skriv ned morgendagens første trekk: «skriv om vers to, linje tre.» En åpen løkke med et navngitt neste steg åpner seg lett igjen; et notat med tittelen «idé» gjør det aldri.

**3. Bestem strukturen tidlig.** Å bestemme «vers, refreng, vers, refreng, bro, refreng» gjør et uendelig problem om til et utfyllingsproblem. Du kan reforhandle kartet senere — men du kan ikke gå uten et. [Guiden vår til å skrive en sang](/no/how-to-write-a-song) dekker strukturvalg grundigere.

**4. Gi sangen en frist med et vitne.** Fortell én person at de får høre den på fredag. Ikke internett — én person. Det milde sosiale presset fra en lovet lytting gjør det viljestyrken ikke klarer.

**5. Erklær den ferdig, og la den hvile.** Ferdig betyr ikke perfekt; det betyr at den kan fremføres fra start til slutt. Syng den gjennom, ta et røft opptak på telefonen, og stopp. To uker senere hører du nøyaktig hva som bør forbedres — og da hører du en *sang*, ikke et sår.

## Tankeskiftet

Profesjonelle fullfører ikke sanger fordi ideene deres er bedre. De fullfører fordi de har sluttet å forhandle med hver sang om hvorvidt den fortjener å eksistere. Kvantitet er ikke kvalitetens fiende i låtskriving — det er veien dit. Ingen skriver sin hundrede sang uten å skrive sin trettiende, og den trettiende finnes bare hvis den fjerde ble ferdig, stygg, en helt vanlig tirsdag.

---

Dette problemet er grunnen til at Veinote finnes. Hele plattformen — skriveverktøyene, øvelsene, strukturen, fellesskapet — er bygget rundt ett løfte: du skal fullføre sangene dine. [Sett deg på ventelisten](/no/waiting-list) og begynn å fullføre.`,
            sv: `Låtskrivandets kyrkogård är inte dåliga låtar — det är halva låtar. En vers och en hook från i våras. Fyrtio röstmemon med titeln »idé«. Forskning på musiker tyder på att den överväldigande majoriteten av påbörjade låtar aldrig blir klara. Den goda nyheten: ofärdiga låtar dör nästan alltid av samma få orsaker, och varje orsak har en praktisk lösning.

## Varför låtar dör halvvägs

**Inspirationen som startade låten tar slut.** Första versen skrev sig själv; den andra vägrar. Det är normalt — öppningen kom från en känsla, och känslor tar inte emot beställningar. Resten av låten är hantverk, och att behandla det skiftet som misslyckande är dödsorsak nummer ett.

**Ribban höjs mitt i låten.** Ditt fragment låter underbart *som fragment*, eftersom fantasin fyller i resten med något perfekt. Varje konkret rad du lägger till konkurrerar med en inbillad rad som inte finns. De som förstår detta blir klara; de som inte gör det polerar takt ett för evigt.

**Det finns ingen deadline och ingen lyssnare.** En låt som ingen väntar på kan förbli ofärdig för alltid, helt gratis. Deadlines känns oromantiska, och de har gjort klart fler låtar än inspirationen någonsin har.

## Systemet

**1. Skilj skrivande från dömande.** Redigera aldrig under en skrivsession. Ta dig till slutet — med tillfälliga rader, fel rim, ett nynnat stick — innan du utvärderar något alls. Du kan inte styra en parkerad bil.

**2. Boka nästa session innan du avslutar denna.** I samma stund du slutar, skriv ner morgondagens första drag: »skriv om vers två, rad tre.« En öppen loop med ett namngivet nästa steg öppnas lätt igen; ett memo med titeln »idé« gör det aldrig.

**3. Bestäm strukturen tidigt.** Att bestämma »vers, refräng, vers, refräng, stick, refräng« förvandlar ett oändligt problem till ett ifyllnadsproblem. Du kan omförhandla kartan senare — men du kan inte gå utan en. [Vår guide till att skriva en låt](/sv/how-to-write-a-song) täcker strukturval mer ingående.

**4. Ge låten en deadline med ett vittne.** Berätta för en person att de får höra den på fredag. Inte internet — en person. Det milda sociala trycket från en utlovad lyssning gör det viljestyrkan inte klarar.

**5. Förklara den klar, och låt den vila.** Klar betyder inte perfekt; det betyder att den går att framföra från början till slut. Sjung igenom den, spela in en grov tagning på telefonen, och sluta. Två veckor senare hör du exakt vad som ska förbättras — och då hör du en *låt*, inte ett sår.

## Tankeskiftet

Proffs gör inte klart låtar för att deras idéer är bättre. De gör klart för att de slutat förhandla med varje låt om huruvida den förtjänar att finnas. Kvantitet är inte kvalitetens fiende i låtskrivande — det är vägen dit. Ingen skriver sin hundrade låt utan att skriva sin trettionde, och den trettionde finns bara om den fjärde blev klar, ful, en helt vanlig tisdag.

---

Det här problemet är anledningen till att Veinote finns. Hela plattformen — skrivverktygen, övningarna, strukturen, gemenskapen — är byggd kring ett löfte: du ska göra klart dina låtar. [Ställ dig på väntelistan](/sv/waiting-list) och börja göra klart.`,
        },
    },
];

console.log(
    commit
        ? "Writing draft pages to Firestore…"
        : "Dry run — nothing will be written. Re-run with --commit to apply.",
);

for (const page of PAGES) {
    console.log(`\n=== site_pages/${page.slug} ===`);
    for (const locale of ["en", "no", "sv"]) {
        console.log(`  ${locale}: "${page.title[locale]}" — ${page.body[locale].length} chars`);
    }

    if (!commit) continue;

    const ref = db.collection("site_pages").doc(page.slug);
    if ((await ref.get()).exists) {
        console.log("  already exists — leaving it alone");
        continue;
    }

    await ref.set({
        id: page.slug,
        slug: page.slug,
        title: page.title,
        description: page.description,
        body: page.body,
        parentId: null,
        order: page.order,
        status: "draft",
        showInFooter: false,
        // Files it under the console's SEO tab rather than among the policies.
        kind: "seo",
        updatedAt: FieldValue.serverTimestamp(),
        updatedByEmail: "seed-seo-pages-script",
    });
    console.log("  written (draft)");
}

console.log(commit ? "\nDone. Review and publish from /admin → Pages." : "\nDry run complete.");
process.exit(0);
