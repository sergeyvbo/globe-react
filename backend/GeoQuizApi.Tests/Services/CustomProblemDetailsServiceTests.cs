using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Moq;
using GeoQuizApi.Services;
using GeoQuizApi.Middleware;
using GeoQuizApi.Models;
using System.Net;

namespace GeoQuizApi.Tests.Services;

public class CustomProblemDetailsServiceTests
{
    private readonly Mock<IProblemDetailsService> _mockProblemDetailsService;
    private readonly Mock<IWebHostEnvironment> _mockEnvironment;
    private readonly Mock<ILogger<CustomProblemDetailsService>> _mockLogger;
    private readonly CustomProblemDetailsService _service;
    private readonly DefaultHttpContext _httpContext;

    public CustomProblemDetailsServiceTests()
    {
        _mockProblemDetailsService = new Mock<IProblemDetailsService>();
        _mockEnvironment = new Mock<IWebHostEnvironment>();
        _mockLogger = new Mock<ILogger<CustomProblemDetailsService>>();
        _service = new CustomProblemDetailsService(
            _mockProblemDetailsService.Object,
            _mockEnvironment.Object,
            _mockLogger.Object);
        
        _httpContext = new DefaultHttpContext();
        _httpContext.Request.Path = "/api/test";
        _httpContext.TraceIdentifier = "test-trace-id";
    }

    [Fact]
    public void CreateProblemDetails_ValidationException_ReturnsCorrectProblemDetails()
    {
        // Arrange
        var validationErrors = new Dictionary<string, object>
        {
            { "email", "Invalid email format" },
            { "password", "Password too short" }
        };
        var exception = new ValidationException(validationErrors);

        // Act
        var result = _service.CreateProblemDetails(exception, _httpContext);

        // Assert
        Assert.Equal(ProblemTypes.ValidationError, result.Type);
        Assert.Equal("One or more validation errors occurred.", result.Title);
        Assert.Equal((int)HttpStatusCode.UnprocessableEntity, result.Status);
        Assert.Equal("Validation failed", result.Detail);
        Assert.Equal("/api/test", result.Instance);
        Assert.Contains("timestamp", result.Extensions);
        Assert.Contains("traceId", result.Extensions);
        Assert.Equal("test-trace-id", result.Extensions["traceId"]);
    }

    [Fact]
    public void CreateProblemDetails_UnauthorizedAccessException_ReturnsCorrectProblemDetails()
    {
        // Arrange
        var exception = new UnauthorizedAccessException("Access denied");

        // Act
        var result = _service.CreateProblemDetails(exception, _httpContext);

        // Assert
        Assert.Equal(ProblemTypes.AuthenticationError, result.Type);
        Assert.Equal("Authentication required", result.Title);
        Assert.Equal((int)HttpStatusCode.Unauthorized, result.Status);
        Assert.Equal("Access denied", result.Detail);
        Assert.Equal("/api/test", result.Instance);
    }

    [Fact]
    public void CreateProblemDetails_KeyNotFoundException_ReturnsCorrectProblemDetails()
    {
        // Arrange
        var exception = new KeyNotFoundException("Resource not found");

        // Act
        var result = _service.CreateProblemDetails(exception, _httpContext);

        // Assert
        Assert.Equal(ProblemTypes.NotFoundError, result.Type);
        Assert.Equal("Resource not found", result.Title);
        Assert.Equal((int)HttpStatusCode.NotFound, result.Status);
        Assert.Equal("Resource not found", result.Detail);
    }

    [Fact]
    public void CreateProblemDetails_InvalidOperationExceptionWithConflict_ReturnsCorrectProblemDetails()
    {
        // Arrange
        var exception = new InvalidOperationException("User already exists");

        // Act
        var result = _service.CreateProblemDetails(exception, _httpContext);

        // Assert
        Assert.Equal(ProblemTypes.ConflictError, result.Type);
        Assert.Equal("Resource conflict", result.Title);
        Assert.Equal((int)HttpStatusCode.Conflict, result.Status);
        Assert.Equal("User already exists", result.Detail);
    }

    [Fact]
    public void CreateProblemDetails_ArgumentException_ReturnsCorrectProblemDetails()
    {
        // Arrange
        var exception = new ArgumentException("Invalid argument");

        // Act
        var result = _service.CreateProblemDetails(exception, _httpContext);

        // Assert
        Assert.Equal(ProblemTypes.BadRequestError, result.Type);
        Assert.Equal("Invalid request", result.Title);
        Assert.Equal((int)HttpStatusCode.BadRequest, result.Status);
        Assert.Equal("Invalid argument", result.Detail);
    }

    [Fact]
    public void CreateProblemDetails_GenericException_InDevelopment_IncludesStackTrace()
    {
        // Arrange
        _mockEnvironment.Setup(x => x.EnvironmentName).Returns(Environments.Development);
        var exception = new Exception("Internal error");

        // Act
        var result = _service.CreateProblemDetails(exception, _httpContext);

        // Assert
        Assert.Equal(ProblemTypes.InternalServerError, result.Type);
        Assert.Equal("An error occurred while processing your request.", result.Title);
        Assert.Equal((int)HttpStatusCode.InternalServerError, result.Status);
        Assert.Equal("Internal error", result.Detail);
        Assert.Contains("stackTrace", result.Extensions);
    }

    [Fact]
    public void CreateProblemDetails_GenericException_InProduction_HidesDetails()
    {
        // Arrange
        _mockEnvironment.Setup(x => x.EnvironmentName).Returns(Environments.Production);
        var exception = new Exception("Internal error");

        // Act
        var result = _service.CreateProblemDetails(exception, _httpContext);

        // Assert
        Assert.Equal(ProblemTypes.InternalServerError, result.Type);
        Assert.Equal("An error occurred while processing your request.", result.Title);
        Assert.Equal((int)HttpStatusCode.InternalServerError, result.Status);
        Assert.Equal("An internal server error occurred", result.Detail);
        Assert.DoesNotContain("stackTrace", result.Extensions);
    }

    [Fact]
    public void CreateValidationProblemDetails_ReturnsCorrectValidationProblemDetails()
    {
        // Arrange
        var validationErrors = new Dictionary<string, object>
        {
            { "email", "Invalid email format" },
            { "password", new[] { "Password too short", "Password must contain numbers" } }
        };
        var exception = new ValidationException(validationErrors);

        // Act
        var result = _service.CreateValidationProblemDetails(exception, _httpContext);

        // Assert
        Assert.Equal(ProblemTypes.ValidationError, result.Type);
        Assert.Equal("One or more validation errors occurred.", result.Title);
        Assert.Equal((int)HttpStatusCode.UnprocessableEntity, result.Status);
        Assert.Equal("The request contains invalid data", result.Detail);
        Assert.Equal("/api/test", result.Instance);
        
        // Check errors are properly formatted
        Assert.Contains("email", result.Errors);
        Assert.Contains("password", result.Errors);
        Assert.Equal(new[] { "Invalid email format" }, result.Errors["email"]);
        Assert.Equal(new[] { "Password too short", "Password must contain numbers" }, result.Errors["password"]);
        
        Assert.Contains("timestamp", result.Extensions);
        Assert.Contains("traceId", result.Extensions);
    }
}