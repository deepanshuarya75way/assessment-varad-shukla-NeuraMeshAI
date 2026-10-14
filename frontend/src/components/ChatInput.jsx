import {
  Code2,
  FileText,
  Globe,
  ImageIcon,
  MessageSquare,
  Mic,
  MicOff,
  Paperclip,
  Presentation,
  Send,
  X,
  Zap,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import sendMessage from "../../features/sendMessage";
import { useDispatch, useSelector } from "react-redux";
import { addMessages, setArtifacts, setIsLoading, setMessages } from "../redux/messageSlice";
import { createConversation } from "../../features/createConversation";
import {
  addConversation,
  setConversationTitle,
  setSelectedConversation,
} from "../redux/conversationSlice";
import { updateConversation } from "../../features/updateConversation";
import { useRef } from "react";

const ChatInput = () => {
  const [value, setValue] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const fileRef = useRef(null);
  const [selectedAgent, setSelectedAgent] = useState("Auto");
  const dispatch = useDispatch();
  const { selectedConversation } = useSelector((state) => state.conversation);
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)

  useEffect(() => {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) return;

  const recognition = new SpeechRecognition();

  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = true;

  recognition.onresult = (event) => {
  let transcript = "";

for (let index = event.resultIndex; index < event.results.length; index++) {
  transcript += event.results[index][0].transcript;
}

setValue(transcript);
  };
recognition.onend = () => {
  setListening(false)
}
  recognitionRef.current = recognition;
}, []);

const toggleMic = () => {
  if (!recognitionRef.current) {
    alert("speech recognition not supported");
    return;
  }

  if (listening) {
    recognitionRef.current.stop();
    setListening(false);
  } else {
    recognitionRef.current.start();
    setListening(true);
  }
};



  const handleSendMessage = async () => {
    dispatch(setIsLoading(true))
    let conversation = selectedConversation;
    console.log("1 HANDLE START");
    if (!conversation) {
      const conver = await createConversation();
      console.log("2 CREATED:", conver);
      dispatch(setSelectedConversation(conver));
      dispatch(addConversation(conver));
      conversation = conver;
    }

    console.log("3 CONVERSATION:", conversation);

    if (conversation.title == "New Chat") {
      await updateConversation({ id: conversation._id, title: value.trim() });

      console.log("4 TITLE UPDATED");
      dispatch(
        setConversationTitle({
          conversationId: conversation._id,
          title: value.slice(0, 25),
        }),
      );
    }

    const formData = new FormData();

    formData.append("prompt", value.trim());
    formData.append("conversationId", conversation?._id);
    formData.append("agent", selectedAgent.toLowerCase());
    if (selectedFile) {
      formData.append("file", selectedFile);
    }

    dispatch(addMessages({ role: "user", content: value.trim() }));

    setValue("");
    setSelectedFile(null)

    const data = await sendMessage(formData);
    dispatch(setIsLoading(false))

    dispatch(setArtifacts(data.artifacts || []));
    dispatch(
      addMessages({
        role: "assistant",
        content: data?.answer,
        images: data?.images,
        sources: data?.sources || []
      }),
    );
    console.log(data);
  };
  const agents = [
    {
      id: "auto",
      icon: Zap,
      label: "Auto",
    },
    {
      id: "chat",
      icon: MessageSquare,
      label: "Chat",
    },
    {
      id: "coding",
      icon: Code2,
      label: "Coding",
    },
    {
      id: "pdf",
      icon: FileText,
      label: "PDF",
    },
    {
      id: "ppt",
      icon: Presentation,
      label: "PPT",
    },
    {
      id: "image",
      icon: ImageIcon,
      label: "Image",
    },
    {
      id: "search",
      icon: Globe,
      label: "Search",
    },
  ];
  return (
    <div className="w-full overflow-hidden px-3 md:px-5 py-4 border-t border-white/[0.06] bg-[#0d0f14]">
      <div className="flex flex-col gap-2 bg-white/[0.03] border border-white/[0.07] rounded-2xl px-4 pt-3.5 pb-3">
        {/* //icons button */}
        <div className="flex w-[80%] gap-2 pr-2 flex-wrap">
          {agents.map((agent) => {
            const isActive = selectedAgent === agent.label;
            const Icon = agent.icon;

            return (
              <div
                onClick={() => setSelectedAgent(agent.label)}
                className={`
              flex-shrink-0
              cursor-pointer
inline-flex
items-center
gap-1.5
px-3
py-2
rounded-full
text-xs
font-medium
border
transition-all

${
  isActive
    ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-transparent shadow-[0_1px_8px_rgba(99,102,241,.35)]"
    : "bg-white/[0.03] text-slate-400 border-white/[0.06] hover:bg-white/[0.07]"
}
            `}
              >
                <Icon
                  size={16}
                  className={isActive ? "text-white" : "text-slate-500"}
                />

                {agent.label}
              </div>
            );
          })}
        </div>

        {selectedFile && (
          <div className="my-3">
            <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
              {selectedFile?.type === "application/pdf" ? (
                <FileText size={16} className="text-red-400" />
              ) : (
                selectedFile.type.startsWith("image/") && (
                  <img
                    src={URL.createObjectURL(selectedFile)}
                    className="h-10 w-10 rounded-xl object-cover mt-3"
                  />
                )
              )}

                          <div>
              <p className="text-xs text-white">{selectedFile?.name}</p>

              <p className="text-[10px] text-slate-500">
                {Math.ceil(selectedFile.size / 1024)}KB
              </p>
            </div>

            <button
              className="ml-2"
              onClick={() => {
                setSelectedFile(null);
                fileRef.current.value = "";
              }}
            >
              <X size={14} className="text-slate-500 hover:text-white" />
            </button>
            </div>

          </div>
        )}

        <textarea
          onChange={(e) => setValue(e.target.value)}
          value={value}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();

              if (value.trim()) {
                handleSendMessage();
              }
            }
          }}
          placeholder="Ask Anything..."
          className="w-full bg-transparent outline-none resize-none text-[14px] text-slate-200 placeholder:text-slate-600 leading-relaxed [scrollbar-width:none] [&::-webkit-scrollbar]:hidden disabled:opacity-50"
          rows={3}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <input
              type="file"
              accept=".pdf,image/*"
              hidden
              ref={fileRef}
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  setSelectedFile(file);
                }
              }}
            />
            <button
              onClick={() => fileRef.current.click()}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/[0.05] border border-transparent hover:border-white/[0.06] transition-all duration-150 bg-transparent cursor-pointer"
            >
              <Paperclip size={16} />
            </button>

            <button
  onClick={toggleMic}
  className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 cursor-pointer ${
      listening
        ? "bg-violet-600 text-white"
        : "text-slate-600 hover:bg-white/[0.05]"
    }`}
>
  {listening ? <Mic size={16} /> : <MicOff size={16} />}
</button>
          </div>
          <button
            disabled={!value}
            onClick={handleSendMessage}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className={`flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer transition-all duration-150 ${
              value.trim()
                ? "bg-linear-to-br from-indigo-500 to-violet-700 hover:opacity-90 text-white"
                : "bg-white/[0.05] text-slate-600 cursor-not-allowed"
            }`}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
