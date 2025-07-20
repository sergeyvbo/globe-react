using System.ComponentModel.DataAnnotations;
using Swashbuckle.AspNetCore.Annotations;

namespace GeoQuizApi.Models.DTOs.GameStats;

/// <summary>
/// Запрос для сохранения игровой сессии
/// </summary>
[SwaggerSchema(Description = "Данные завершенной игровой сессии для сохранения")]
public class GameSessionRequest
{
    /// <summary>
    /// Тип игры
    /// </summary>
    /// <example>countries</example>
    [Required(ErrorMessage = "Game type is required")]
    [MaxLength(50, ErrorMessage = "Game type cannot exceed 50 characters")]
    [SwaggerSchema(Description = "Тип игры (countries, flags, states)")]
    public string GameType { get; set; } = string.Empty;

    /// <summary>
    /// Количество правильных ответов
    /// </summary>
    /// <example>15</example>
    [Range(0, int.MaxValue, ErrorMessage = "Correct answers must be non-negative")]
    [SwaggerSchema(Description = "Количество правильных ответов в игровой сессии")]
    public int CorrectAnswers { get; set; }

    /// <summary>
    /// Количество неправильных ответов
    /// </summary>
    /// <example>3</example>
    [Range(0, int.MaxValue, ErrorMessage = "Wrong answers must be non-negative")]
    [SwaggerSchema(Description = "Количество неправильных ответов в игровой сессии")]
    public int WrongAnswers { get; set; }

    /// <summary>
    /// Время начала игровой сессии
    /// </summary>
    /// <example>2024-01-20T10:30:00Z</example>
    [Required(ErrorMessage = "Session start time is required")]
    [SwaggerSchema(Description = "Время начала игровой сессии в формате ISO 8601")]
    public DateTime SessionStartTime { get; set; }

    /// <summary>
    /// Время окончания игровой сессии (опционально)
    /// </summary>
    /// <example>2024-01-20T10:35:00Z</example>
    [SwaggerSchema(Description = "Время окончания игровой сессии в формате ISO 8601")]
    public DateTime? SessionEndTime { get; set; }
}