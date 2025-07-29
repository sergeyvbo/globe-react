using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using GeoQuizApi.Models.DTOs.Auth;
using GeoQuizApi.Models.DTOs.GameStats;
using GeoQuizApi.Tests.TestUtilities;

namespace GeoQuizApi.Tests.Integration;

[Trait("Category", "Integration")]
public class DebugGameTypeValidationTest : BaseIntegrationTest
{
    public DebugGameTypeValidationTest(TestWebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Fact]
    public async Task Debug_GameType_Validation_Response()
    {
        // Arrange - Get auth token
        var registerRequest = new RegisterRequest
        {
            Email = GenerateUniqueEmail("debug"),
            Password = "TestPassword123",
            Name = "Debug User"
        };

        var registerResponse = await _client.PostAsJsonAsync("/api/auth/register", registerRequest);
        var authResponse = await registerResponse.Content.ReadFromJsonAsync<AuthResponse>();
        
        _client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", authResponse!.AccessToken);

        var baseTime = GenerateUniqueTimestamp();
        var gameSessionRequest = new GameSessionRequest
        {
            GameType = "invalid-game-type",
            CorrectAnswers = 8,
            WrongAnswers = 2,
            SessionStartTime = baseTime.AddMinutes(-5),
            SessionEndTime = baseTime
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/game-stats", gameSessionRequest);

        // Assert
        var content = await response.Content.ReadAsStringAsync();
        Console.WriteLine($"Status Code: {response.StatusCode}");
        Console.WriteLine($"Content Type: {response.Content.Headers.ContentType?.MediaType}");
        Console.WriteLine($"Response Content: {content}");

        // Try to read as ValidationProblemDetails
        try
        {
            var validationProblemDetails = await response.ReadValidationProblemDetailsAsync();
            Console.WriteLine($"ValidationProblemDetails Type: {validationProblemDetails.Type}");
            Console.WriteLine($"ValidationProblemDetails Title: {validationProblemDetails.Title}");
            Console.WriteLine($"ValidationProblemDetails Status: {validationProblemDetails.Status}");
            Console.WriteLine($"ValidationProblemDetails Errors Count: {validationProblemDetails.Errors.Count}");
            
            foreach (var error in validationProblemDetails.Errors)
            {
                Console.WriteLine($"Error Key: {error.Key}, Values: [{string.Join(", ", error.Value)}]");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to read as ValidationProblemDetails: {ex.Message}");
            
            // Try to read as regular ProblemDetails
            try
            {
                var problemDetails = await response.ReadProblemDetailsAsync();
                Console.WriteLine($"ProblemDetails Type: {problemDetails.Type}");
                Console.WriteLine($"ProblemDetails Title: {problemDetails.Title}");
                Console.WriteLine($"ProblemDetails Status: {problemDetails.Status}");
                Console.WriteLine($"ProblemDetails Detail: {problemDetails.Detail}");
            }
            catch (Exception ex2)
            {
                Console.WriteLine($"Failed to read as ProblemDetails: {ex2.Message}");
            }
        }
    }
}