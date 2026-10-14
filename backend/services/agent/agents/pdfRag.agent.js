import fs from "fs"
import { PDFParse } from "pdf-parse"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { vectorStore } from "../config/vectorDb.js"
import { getModel } from "../config/llmModel.js"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { deductCredits } from "../utils/deductCredits.js"
import { checkAgentLimit } from "../config/agentLimit.js";
export const pdfRag = async (state) => {
    try {
        await checkAgentLimit(state.userId, "pdf")
        const buffer = fs.readFileSync(state.file.path)
        const pdf = new PDFParse({
            data: buffer
        })
        const res = await pdf.getText()
        const pages = res.pages || []
        const text =  res.text

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize:1000,
            chunkOverlap:200
        })
        const docs = [];

        if(res.pages?.length){
            for(let i=0; i<res.pages.length; i++){
                const pages = res.pages[1];

                if(!pages.text?.trim()) continue;

                const chunks = await splitter.createDocument(
                    [pages.text],
                    [{page: pages.num || i+1}]
                );
                docs.push(...chunks)
            }
        }else{
            const chunks = await splitter.createDocuments([res.text]);
            docs.push(...chunks)
        }


        const collectionName = `pdf-${Date.now()}`

        const store = await vectorStore(docs, collectionName)

        const releventDocs = await store.similaritySearch(state.prompt, 5)

        const context = releventDocs.map(d => d.pageContent).join("\n\n")

        const page = [
            ...new Set(
                releventDocs.map(d => d.metadata?.page)
                .filter(p => Number.isInteger(p) && p>0)
            )
        ].sort((a,b) => a - b);

        const sources = releventDocs.length? [{
            type:"pdf",
            document: state.file.originalname || "uploaded PDF", page
        }]: [];

        const llm = await getModel("pdfRag")

        const messages = [
  new SystemMessage(`You are CortexAI PDF Assistant.

Rules:

- Answer ONLY from the uploaded PDF.
- Never make up information.
- If the answer is not present in the PDF, reply:

"I couldn't find this information in the uploaded PDF."

- Use Markdown formatting.
`),

    new HumanMessage(`
        context:${context}
        Question:${state.prompt}
        `)
];

    const response = await llm.invoke(messages)

    await deductCredits(state.userId, "pdf")

    return {
        ...state,
        aiResponse: response.content,
        sources
    }


    } catch (error) {
        console.log(error);
        
        return {
            ...state,
            aiResponse:error?.data?.message || "Failed to Analyze PDF"
        }
    }
    finally{
        fs.unlinkSync(state.file.path)
    }
}