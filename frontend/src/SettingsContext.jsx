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

  const [changeUsername, setChangeUsername] = useState(() => {
    const saved = localStorage.getItem("changeUsername")
    return saved !== null ? JSON.parse(saved) : false
  })

  const [changePassword, setChangePassword] = useState(() => {
    const saved = localStorage.getItem("changePassword")
    return saved !== null ? JSON.parse(saved) : false
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

  useEffect(() => {
    localStorage.setItem("changeUsername", JSON.stringify(changeUsername))
  }, [changeUsername])

  useEffect(() => {
    localStorage.setItem("changePassword", JSON.stringify(changePassword))
  }, [changePassword])

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
        setHistoryEnabled,
        changeUsername,
        setChangeUsername,
        changePassword,
        setChangePassword

      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}