// ВРЕМЕННЫЕ ДЕМО-ДАННЫЕ: вымышленные платформы и тестовые ссылки, позже заменим настоящими сведениями.
// sourceType: "platform" — российская платформа, "other_site" — другой сайт.
// status: "available" — доступен, "unavailable" — недоступен. checkedDate — дата проверки (ГГГГ-ММ-ДД).
const AVAILABILITY = [
  // Фильмы 1 и 2: есть на российской платформе
  { movieId: 1, sourceName: "Демо-Платформа А", sourceType: "platform", status: "available", url: "https://example.com/demo-a/1", checkedDate: "2026-01-01" },
  { movieId: 2, sourceName: "Демо-Платформа Б", sourceType: "platform", status: "available", url: "https://example.com/demo-b/2", checkedDate: "2026-01-01" },
  // Фильмы 3 и 4: на российских платформах нет, есть другой сайт
  { movieId: 3, sourceName: "Демо-Платформа А", sourceType: "platform", status: "unavailable", url: "", checkedDate: "2026-01-01" },
  { movieId: 3, sourceName: "VK Видео", sourceType: "other_site", status: "available", url: "https://vk.com/video", checkedDate: "2026-01-01" },
  { movieId: 4, sourceName: "VK Видео", sourceType: "other_site", status: "available", url: "https://vk.com/video", checkedDate: "2026-01-01" },
  // Фильм 5: нигде не доступен; фильмы 6–12: сведений нет
  { movieId: 5, sourceName: "Демо-Платформа Б", sourceType: "platform", status: "unavailable", url: "", checkedDate: "2026-01-01" }
];
