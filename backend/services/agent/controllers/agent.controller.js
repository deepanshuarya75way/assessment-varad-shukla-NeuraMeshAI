import axios from "axios"
import { graph } from "../graph/graph.js"
import { addMessage } from "../config/memory.js"
import redis from "../../../shared/redis/redis.js"
import { imageGen } from "../agents/imageGen.agent.js"

export const agent = async(req, res, next) => {
    try {
        const {prompt, conversationId, agent} = req.body
        console.log(agent);
        
        const file = req.file
        const userId = req.headers["x-user-id"]
        await axios.post(`${process.env.CHAT_SERVICE}/save-message`, {
            conversationId,
            role:"user",
            content:prompt
        })
        console.log("MESSAGE SAVED")
        const result = await graph.invoke({
            prompt,
            conversationId,
            agent,
            userId,
            file
        })

        const response = result.aiResponse
        console.log(response);
        
        await addMessage(conversationId, "user", prompt)

        await addMessage(conversationId, "assistant", response)
        await axios.post(`${process.env.CHAT_SERVICE}/save-message`, {
            conversationId,
            role:"assistant",
            content:result?.aiResponse,
            images:result?.images,
            artifacts:result?.artifacts,
            sources: result?.sources || []
        })
        return res.status(200).json({
            answer:result?.aiResponse,
            images:result?.images,
            artifacts:result?.artifacts,
            sources: result?.sources || []
        })
    } catch (error) {
        console.log(
    "AGENT ERROR:",
    error.response?.data || error.message
  )
        next(error)
    }
}