using FluentAssertions;
using GeoQuizApi.Models.Exceptions;
using GeoQuizApi.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Moq;

namespace GeoQuizApi.Tests.Unit;

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
        _httpContext = new DefaultHttpContext();
        _httpContext.Request.Path = "/api/test";
        _httpContext.TraceIdentifier = "test-trace-id";

        _service = new CustomProblemDetailsService(
            _mockProblemDetailsService.Object,
            _mockEnvironment.Object,
            _mockLogger.Object);
    }

    [Fact]
    public void CreateValidationProblemDetails_WithValidationException_ShouldIncludeErrors()
    {
        // Arrange
        var validationException = new ValidationException("GameType", "Invalid game type");

        // Act
        var result = _service.CreateValidationProblemDetails(validationException, _httpContext);

        // Assert
        result.Should().NotBeNull();
        result.Type.Should().Be("https://geoquiz.sergeivbo.ru/problems/validation-error");
        result.Title.Should().Be("One or more validation errors occurred.");
        result.Status.Should().Be(422);
        result.Instance.Should().Be("/api/test");
        
        // This is the key assertion - the errors should be populated
        result.Errors.Should().NotBeNull();
        result.Errors.Should().HaveCount(1);
        result.Errors.Should().ContainKey("GameType");
        result.Errors["GameType"].Should().BeEquivalentTo(new[] { "Invalid game type" });
        
        // Check extensions
        result.Extensions.Should().ContainKey("timestamp");
        result.Extensions.Should().ContainKey("traceId");
        result.Extensions["traceId"].Should().Be("test-trace-id");
    }

    [Fact]
    public void CreateValidationProblemDetails_WithMultipleErrors_ShouldIncludeAllErrors()
    {
        // Arrange
        var errors = new Dictionary<string, string[]>
        {
            { "GameType", new[] { "Invalid game type" } },
            { "CorrectAnswers", new[] { "Must be non-negative" } }
        };
        var validationException = new ValidationException(errors);

        // Act
        var result = _service.CreateValidationProblemDetails(validationException, _httpContext);

        // Assert
        result.Should().NotBeNull();
        result.Errors.Should().NotBeNull();
        result.Errors.Should().HaveCount(2);
        result.Errors.Should().ContainKey("GameType");
        result.Errors.Should().ContainKey("CorrectAnswers");
        result.Errors["GameType"].Should().BeEquivalentTo(new[] { "Invalid game type" });
        result.Errors["CorrectAnswers"].Should().BeEquivalentTo(new[] { "Must be non-negative" });
    }
}