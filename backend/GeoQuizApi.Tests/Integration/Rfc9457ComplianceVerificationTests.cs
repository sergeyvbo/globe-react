using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using GeoQuizApi.Models;
using GeoQuizApi.Models.DTOs.Auth;
using GeoQuizApi.Models.DTOs.GameStats;
using GeoQuizApi.Tests.TestUtilities;
using Microsoft.AspNetCore.Mvc;

namespace GeoQuizApi.Tests.Integration;

/// <summary>
/// Comprehensive verification tests for RFC 9457 compliance across all API endpoints.
/// This test class systematically verifies that all error responses conform to RFC 9457 standards.
/// </summary>
[Trait("Category", "Integration")]
public class Rfc9457ComplianceVerificationTests : BaseIntegrationTest
{
    public Rfc9457ComplianceVerificationTests(TestWebApplicationFactory<Program> factory) : base(factory)
    {
    }

    private async Task<string> GetAuthTokenAsync(string? email = null, string password = "TestPassword123")
    {
        var registerRequest = new RegisterRequest
        {
            Email = email ?? GenerateUniqueEmail("rfc9457test"),
            Password = password,
            Name = "RFC 9457 Test User"
        };

        var response = await _client.PostAsJsonAsync("/api/auth/register", registerRequest);
        var authResponse = await response.Content.ReadFromJsonAsync<AuthResponse>();
        return authResponse!.AccessToken;
    }

    #region Authentication Endpoints Tests

    [Fact]
    public async Task AuthEndpoints_Register_WithInvalidEmail_ShouldReturnRfc9457ValidationError()
    {
        // Arrange
        var registerRequest = new RegisterRequest
        {
            Email = "invalid-email-format",
            Password = "TestPassword123",
            Name = "Test User"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/register", registerRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        response.Content.Headers.ContentType?.MediaType.Should().BeOneOf("application/problem+json", "application/json");
        
        var problemDetails = await response.ReadProblemDetailsAsync();
        problemDetails.ShouldBeValidRfc9457ProblemDetails(
            expectedType: ProblemTypes.ValidationError,
            expectedTitle: "One or more validation errors occurred.",
            expectedStatus: (int)HttpStatusCode.BadRequest,
            expectedInstance: "/api/auth/register"
        );
        problemDetails.ShouldHaveTimestamp();
        problemDetails.ShouldHaveTraceId();
    }

    [Fact]
    public async Task AuthEndpoints_Register_WithWeakPassword_ShouldReturnRfc9457ValidationError()
    {
        // Arrange
        var registerRequest = new RegisterRequest
        {
            Email = GenerateUniqueEmail("weakpass"),
            Password = "123", // Too weak
            Name = "Test User"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/register", registerRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        response.Content.Headers.ContentType?.MediaType.Should().BeOneOf("application/problem+json", "application/json");
        
        var problemDetails = await response.ReadProblemDetailsAsync();
        problemDetails.ShouldBeValidRfc9457ProblemDetails(
            expectedType: ProblemTypes.ValidationError,
            expectedTitle: "One or more validation errors occurred.",
            expectedStatus: (int)HttpStatusCode.BadRequest,
            expectedInstance: "/api/auth/register"
        );
        problemDetails.ShouldHaveTimestamp();
        problemDetails.ShouldHaveTraceId();
    }

    [Fact]
    public async Task AuthEndpoints_Register_WithExistingEmail_ShouldReturnRfc9457ConflictError()
    {
        // Arrange
        var email = GenerateUniqueEmail("conflict");
        
        // First registration
        var firstRequest = new RegisterRequest
        {
            Email = email,
            Password = "TestPassword123",
            Name = "First User"
        };
        await _client.PostAsJsonAsync("/api/auth/register", firstRequest);

        // Second registration with same email
        var secondRequest = new RegisterRequest
        {
            Email = email,
            Password = "AnotherPassword123",
            Name = "Second User"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/register", secondRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        response.Content.Headers.ContentType?.MediaType.Should().BeOneOf("application/problem+json", "application/json");
        
        var problemDetails = await response.ReadProblemDetailsAsync();
        problemDetails.ShouldBeValidRfc9457ProblemDetails(
            expectedType: ProblemTypes.ConflictError,
            expectedTitle: "Resource conflict",
            expectedStatus: (int)HttpStatusCode.Conflict,
            expectedInstance: "/api/auth/register"
        );
        problemDetails.Detail.Should().Contain("already exists");
        problemDetails.ShouldHaveTimestamp();
        problemDetails.ShouldHaveTraceId();
    }

    [Fact]
    public async Task AuthEndpoints_Login_WithInvalidCredentials_ShouldReturnRfc9457AuthenticationError()
    {
        // Arrange
        var loginRequest = new LoginRequest
        {
            Email = "nonexistent@example.com",
            Password = "WrongPassword123"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/login", loginRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        response.Content.Headers.ContentType?.MediaType.Should().BeOneOf("application/problem+json", "application/json");
        
        var problemDetails = await response.ReadProblemDetailsAsync();
        problemDetails.ShouldBeValidRfc9457ProblemDetails(
            expectedType: ProblemTypes.AuthenticationError,
            expectedTitle: "Authentication required",
            expectedStatus: (int)HttpStatusCode.Unauthorized,
            expectedInstance: "/api/auth/login"
        );
        problemDetails.ShouldHaveTimestamp();
        problemDetails.ShouldHaveTraceId();
    }

    [Fact]
    public async Task AuthEndpoints_RefreshToken_WithInvalidToken_ShouldReturnRfc9457AuthenticationError()
    {
        // Arrange
        var refreshRequest = new RefreshTokenRequest
        {
            RefreshToken = "invalid-refresh-token"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/refresh", refreshRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        response.Content.Headers.ContentType?.MediaType.Should().BeOneOf("application/problem+json", "application/json");
        
        var problemDetails = await response.ReadProblemDetailsAsync();
        problemDetails.ShouldBeValidRfc9457ProblemDetails(
            expectedType: ProblemTypes.AuthenticationError,
            expectedTitle: "Authentication required",
            expectedStatus: (int)HttpStatusCode.Unauthorized,
            expectedInstance: "/api/auth/refresh"
        );
        problemDetails.ShouldHaveTimestamp();
        problemDetails.ShouldHaveTraceId();
    }

    [Fact]
    public async Task AuthEndpoints_GetMe_WithoutToken_ShouldReturnRfc9457AuthenticationError()
    {
        // Act
        var response = await _client.GetAsync("/api/auth/me");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        response.Content.Headers.ContentType?.MediaType.Should().BeOneOf("application/problem+json", "application/json");
        
        var problemDetails = await response.ReadProblemDetailsAsync();
        problemDetails.ShouldBeValidRfc9457ProblemDetails(
            expectedType: ProblemTypes.AuthenticationError,
            expectedTitle: "Authentication required",
            expectedStatus: (int)HttpStatusCode.Unauthorized,
            expectedInstance: "/api/auth/me"
        );
        problemDetails.ShouldHaveTimestamp();
        problemDetails.ShouldHaveTraceId();
    }

    #endregion

    #region Game Statistics Endpoints Tests

    [Fact]
    public async Task GameStatsEndpoints_SaveGameSession_WithoutAuth_ShouldReturnRfc9457AuthenticationError()
    {
        // Arrange
        var baseTime = GenerateUniqueTimestamp();
        var gameSessionRequest = new GameSessionRequest
        {
            GameType = "countries",
            CorrectAnswers = 8,
            WrongAnswers = 2,
            SessionStartTime = baseTime.AddMinutes(-5),
            SessionEndTime = baseTime
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/game-stats", gameSessionRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        response.Content.Headers.ContentType?.MediaType.Should().BeOneOf("application/problem+json", "application/json");
        
        var problemDetails = await response.ReadProblemDetailsAsync();
        problemDetails.ShouldBeValidRfc9457ProblemDetails(
            expectedType: ProblemTypes.AuthenticationError,
            expectedTitle: "Authentication required",
            expectedStatus: (int)HttpStatusCode.Unauthorized,
            expectedInstance: "/api/game-stats"
        );
        problemDetails.ShouldHaveTimestamp();
        problemDetails.ShouldHaveTraceId();
    }

    [Fact]
    public async Task GameStatsEndpoints_SaveGameSession_WithInvalidGameType_ShouldReturnRfc9457ValidationError()
    {
        // Arrange
        var token = await GetAuthTokenAsync();
        _client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

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
        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        response.Content.Headers.ContentType?.MediaType.Should().BeOneOf("application/problem+json", "application/json");
        
        var validationProblemDetails = await response.ReadValidationProblemDetailsAsync();
        validationProblemDetails.ShouldBeValidRfc9457ValidationProblemDetails(
            expectedType: ProblemTypes.ValidationError,
            expectedTitle: "One or more validation errors occurred.",
            expectedStatus: (int)HttpStatusCode.UnprocessableEntity,
            expectedInstance: "/api/game-stats"
        );
        validationProblemDetails.Errors.Should().ContainKey("GameType");
        validationProblemDetails.ShouldHaveTimestamp();
        validationProblemDetails.ShouldHaveTraceId();
    }

    [Fact]
    public async Task GameStatsEndpoints_GetUserStats_WithoutAuth_ShouldReturnRfc9457AuthenticationError()
    {
        // Act
        var response = await _client.GetAsync("/api/game-stats/me");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        response.Content.Headers.ContentType?.MediaType.Should().BeOneOf("application/problem+json", "application/json");
        
        var problemDetails = await response.ReadProblemDetailsAsync();
        problemDetails.ShouldBeValidRfc9457ProblemDetails(
            expectedType: ProblemTypes.AuthenticationError,
            expectedTitle: "Authentication required",
            expectedStatus: (int)HttpStatusCode.Unauthorized,
            expectedInstance: "/api/game-stats/me"
        );
        problemDetails.ShouldHaveTimestamp();
        problemDetails.ShouldHaveTraceId();
    }

    [Fact]
    public async Task GameStatsEndpoints_GetUserGameHistory_WithoutAuth_ShouldReturnRfc9457AuthenticationError()
    {
        // Act
        var response = await _client.GetAsync("/api/game-stats/me/history");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        response.Content.Headers.ContentType?.MediaType.Should().BeOneOf("application/problem+json", "application/json");
        
        var problemDetails = await response.ReadProblemDetailsAsync();
        problemDetails.ShouldBeValidRfc9457ProblemDetails(
            expectedType: ProblemTypes.AuthenticationError,
            expectedTitle: "Authentication required",
            expectedStatus: (int)HttpStatusCode.Unauthorized,
            expectedInstance: "/api/game-stats/me/history"
        );
        problemDetails.ShouldHaveTimestamp();
        problemDetails.ShouldHaveTraceId();
    }

    [Fact]
    public async Task GameStatsEndpoints_MigrateAnonymousProgress_WithoutAuth_ShouldReturnRfc9457AuthenticationError()
    {
        // Arrange
        var migrateRequest = new MigrateProgressRequest
        {
            AnonymousSessions = new List<AnonymousGameSessionDto>()
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/game-stats/migrate", migrateRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        response.Content.Headers.ContentType?.MediaType.Should().BeOneOf("application/problem+json", "application/json");
        
        var problemDetails = await response.ReadProblemDetailsAsync();
        problemDetails.ShouldBeValidRfc9457ProblemDetails(
            expectedType: ProblemTypes.AuthenticationError,
            expectedTitle: "Authentication required",
            expectedStatus: (int)HttpStatusCode.Unauthorized,
            expectedInstance: "/api/game-stats/migrate"
        );
        problemDetails.ShouldHaveTimestamp();
        problemDetails.ShouldHaveTraceId();
    }

    #endregion

    #region Leaderboard Endpoints Tests

    [Fact]
    public async Task LeaderboardEndpoints_GetLeaderboardByGameType_WithInvalidGameType_ShouldReturnRfc9457BadRequestError()
    {
        // Act
        var response = await _client.GetAsync("/api/leaderboard/game-type/invalid-game-type");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        response.Content.Headers.ContentType?.MediaType.Should().BeOneOf("application/problem+json", "application/json");
        
        var problemDetails = await response.ReadProblemDetailsAsync();
        problemDetails.ShouldBeValidRfc9457ProblemDetails(
            expectedType: ProblemTypes.BadRequestError,
            expectedTitle: "Invalid request",
            expectedStatus: (int)HttpStatusCode.BadRequest,
            expectedInstance: "/api/leaderboard/game-type/invalid-game-type"
        );
        problemDetails.Detail.Should().Contain("Invalid game type");
        problemDetails.ShouldHaveTimestamp();
        problemDetails.ShouldHaveTraceId();
    }

    [Fact]
    public async Task LeaderboardEndpoints_GetLeaderboardByPeriod_WithInvalidPeriod_ShouldReturnRfc9457BadRequestError()
    {
        // Act
        var response = await _client.GetAsync("/api/leaderboard/period/invalid-period");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        response.Content.Headers.ContentType?.MediaType.Should().BeOneOf("application/problem+json", "application/json");
        
        var problemDetails = await response.ReadProblemDetailsAsync();
        problemDetails.ShouldBeValidRfc9457ProblemDetails(
            expectedType: ProblemTypes.BadRequestError,
            expectedTitle: "Invalid request",
            expectedStatus: (int)HttpStatusCode.BadRequest,
            expectedInstance: "/api/leaderboard/period/invalid-period"
        );
        problemDetails.Detail.Should().Contain("Invalid period");
        problemDetails.ShouldHaveTimestamp();
        problemDetails.ShouldHaveTraceId();
    }

    #endregion

    #region Server Error Tests

    [Fact]
    public async Task ServerError_NonExistentEndpoint_ShouldReturnRfc9457NotFoundError()
    {
        // Act
        var response = await _client.GetAsync("/api/non-existent-endpoint");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        response.Content.Headers.ContentType?.MediaType.Should().BeOneOf("application/problem+json", "application/json");
        
        var problemDetails = await response.ReadProblemDetailsAsync();
        problemDetails.ShouldBeValidRfc9457ProblemDetails(
            expectedType: ProblemTypes.NotFoundError,
            expectedTitle: "Resource not found",
            expectedStatus: (int)HttpStatusCode.NotFound,
            expectedInstance: "/api/non-existent-endpoint"
        );
        problemDetails.ShouldHaveTimestamp();
        problemDetails.ShouldHaveTraceId();
    }

    #endregion

    #region Content-Type Header Verification

    [Theory]
    [InlineData("/api/auth/login", "POST")]
    [InlineData("/api/auth/refresh", "POST")]
    [InlineData("/api/auth/me", "GET")]
    [InlineData("/api/game-stats", "POST")]
    [InlineData("/api/game-stats/me", "GET")]
    [InlineData("/api/game-stats/me/history", "GET")]
    [InlineData("/api/game-stats/migrate", "POST")]
    [InlineData("/api/leaderboard/game-type/invalid-type", "GET")]
    [InlineData("/api/leaderboard/period/invalid-period", "GET")]
    public async Task AllErrorEndpoints_ShouldReturnCorrectContentTypeHeader(string endpoint, string method)
    {
        // Arrange
        HttpResponseMessage response;
        
        // Act
        switch (method.ToUpper())
        {
            case "GET":
                response = await _client.GetAsync(endpoint);
                break;
            case "POST":
                response = await _client.PostAsJsonAsync(endpoint, new { });
                break;
            default:
                throw new ArgumentException($"Unsupported HTTP method: {method}");
        }

        // Assert
        response.IsSuccessStatusCode.Should().BeFalse("We expect error responses for this test");
        response.Content.Headers.ContentType?.MediaType.Should().BeOneOf("application/problem+json", "application/json");
    }

    #endregion

    #region RFC 9457 Field Validation

    [Fact]
    public async Task AllErrorResponses_ShouldHaveRequiredRfc9457Fields()
    {
        // Test various error scenarios to ensure all have required RFC 9457 fields
        var testCases = new[]
        {
            new { Endpoint = "/api/auth/login", Method = "POST", Body = (object)new LoginRequest { Email = "invalid", Password = "wrong" } },
            new { Endpoint = "/api/auth/refresh", Method = "POST", Body = (object)new RefreshTokenRequest { RefreshToken = "invalid" } },
            new { Endpoint = "/api/auth/me", Method = "GET", Body = (object?)null },
            new { Endpoint = "/api/game-stats", Method = "POST", Body = (object)new GameSessionRequest { GameType = "invalid", CorrectAnswers = 1, WrongAnswers = 1, SessionStartTime = DateTime.UtcNow, SessionEndTime = DateTime.UtcNow } },
            new { Endpoint = "/api/leaderboard/game-type/invalid", Method = "GET", Body = (object?)null }
        };

        foreach (var testCase in testCases)
        {
            // Act
            HttpResponseMessage response;
            if (testCase.Method == "GET")
            {
                response = await _client.GetAsync(testCase.Endpoint);
            }
            else
            {
                response = await _client.PostAsJsonAsync(testCase.Endpoint, testCase.Body ?? new { });
            }

            // Assert
            response.IsSuccessStatusCode.Should().BeFalse($"Expected error response for {testCase.Endpoint}");
            
            var problemDetails = await response.ReadProblemDetailsAsync();
            
            // Verify all required RFC 9457 fields are present
            problemDetails.Type.Should().NotBeNullOrEmpty($"Type field is required for {testCase.Endpoint}");
            problemDetails.Title.Should().NotBeNullOrEmpty($"Title field is required for {testCase.Endpoint}");
            problemDetails.Status.Should().BeGreaterThan(0, $"Status field is required for {testCase.Endpoint}");
            problemDetails.Instance.Should().NotBeNullOrEmpty($"Instance field should be set for {testCase.Endpoint}");
            
            // Verify extensions
            problemDetails.Extensions.Should().NotBeNull($"Extensions should be present for {testCase.Endpoint}");
            problemDetails.Extensions.Should().ContainKey("timestamp", $"Timestamp extension should be present for {testCase.Endpoint}");
            problemDetails.Extensions.Should().ContainKey("traceId", $"TraceId extension should be present for {testCase.Endpoint}");
        }
    }

    #endregion
}