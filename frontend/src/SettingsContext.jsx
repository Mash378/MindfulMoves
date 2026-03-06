import { createContext, useContext, useState, useEffect } from "react"

const SettingsContext = createContext()

export function SettingsProvider({ children }) {

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "light"
  })

  const [difficulty, setDifficulty] = useState(() => {
    return localStorage.getItem("difficulty") || "medium"
  })

  const [timerEnabled, setTimerEnabled] = useState(() => {
    const saved = localStorage.getItem("timerEnabled")
    return saved !== null ? JSON.parse(saved) : true
  })

  const [historyEnabled, setHistoryEnabled] = useState(() => {
    const saved = localStorage.getItem("historyEnabled")
    return saved !== null ? JSON.parse(saved) : true
  })

  // save settings
  useEffect(() => {
    localStorage.setItem("theme", theme)

    document.documentElement.classList.remove(
      "light",
      "dark",
      "game",
      "sky",
      "candy"
    )

    document.documentElement.classList.add(theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem("difficulty", difficulty)
  }, [difficulty])

  useEffect(() => {
    localStorage.setItem("timerEnabled", JSON.stringify(timerEnabled))
  }, [timerEnabled])

  useEffect(() => {
    localStorage.setItem("historyEnabled", JSON.stringify(historyEnabled))
  }, [historyEnabled])

  return (
    <SettingsContext.Provider
      value={{
        theme,
        setTheme,
        difficulty,
        setDifficulty,
        timerEnabled,
        setTimerEnabled,
        historyEnabled,
        setHistoryEnabled
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}