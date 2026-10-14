import { checkAgentLimit } from "../config/agentLimit.js";
import { searchTool } from "../config/tavily.js"
import { deductCredits } from "../utils/deductCredits.js";

export const search = async (state) => {
     try {
        await checkAgentLimit(state.userId, "search")
        console.log("search agent called");
        
        console.log("prompt", state.prompt)
        const results = await searchTool.invoke({
            query: state.prompt
        })
        console.log("search Result", JSON.stringfy(results, null, 2))
        await deductCredits(state.userId, "search")
        console.log(results);

        const rawResults = Array.isArray(results.results)? results.results : [];
        const sources = rawResults.filter((item) => {
            try{
                const url = new URL(item.url)
                return [ "http:", "https:"].includes(url.protocol)
            } catch {
                return false
            }
        }).map((item) => ({
            type: "web",
            title: item.title || item.url,
            url: item.url
        }))

        return{
            ...state,
            searchResults:results,
            sources,
            images:results.images
        }
     } catch (error) {
         return{
            ...state,
            searchResults:[],
            sources:[],
            images:[],
            aiResponse:error?.data?.message || 'Failed To Generate Response'
        }
     }
}