using System.Net;
using System.Text.Json;
using FluentAssertions;
using GeoQuizApi.Middleware;
using GeoQuizApi.Models.Exceptions;
using GeoQuizApi.Models;
using GeoQuizApi.Services;
using GeoQuizApi.Tests.TestUtilities;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;

namespace GeoQuizApi.Tests.Unit.Middleware;

[Trait("Category", "Unit")]
public class Rfc9457ErrorHandlingMiddlewareTests
{
    private readonly Mock<ILogger<Rfc9457ErrorHandlingMiddleware>> _mockLogger;
    private readonly Mock<IWebHostEnvironment> _mockEnvironment;
    private readonly Mock<IProblemDetailsService> _mockProblemDetailsService;
    private readonly Mock<ICustomProblemDetailsService> _mockCustomProblemDetailsService;
    private readonly Rfc9457ErrorHandlingMiddleware _middleware;

    public Rfc9457ErrorHandlingMiddlewareTests()
    {
        _mockLogger = new Mock<ILogger<Rfc9457ErrorHandlingMiddleware>>();
        _mockEnvironment = new Mock<IWebHostEnvironment>();
        _mockProblemDetailsService = new Mock<IProblemDetailsService>();
        _mockCustomProblemDetailsService = new Mock<ICustomProblemDetailsService>();

        _middleware = new Rfc9457ErrorHandlingMiddleware(
            next: (context) => throw new InvalidOperationException("Test exception"),
            _mockLogger.Object,
            _mockProblemDetailsService.Object,
            _mockCustomProblemDetailsService.Object
        );
    }

    [Fact]
    public async Task InvokeAsync_WithValidationException_ShouldReturnValidationProblemDetails()
    {
        // Arrange
        var context = CreateHttpContext();
        var validationErrors = new Dictionary<string, string[]>
        {
            { "email", new[] { "Invalid email format" } },
            { "password", new[] { "Password too short" } }
        };
        var validationException = new ValidationException(validationErrors);

        var expectedProblemDetails = new ValidationProblemDetails(validationErrors)
        {
            Type = ProblemTypes.ValidationError,
            Title = "One or more validation errors occurred.",
            Status = (int)HttpStatusCode.UnprocessableEntity,
            Detail = "The request contains invalid data",
            Instance = "/api/test"
        };

        _mockCustomProblemDetailsService
            .Setup(x => x.CreateValidationProblemDetails(It.IsAny<ValidationException>(), It.IsAny<HttpContext>()))
            .Returns(expectedProblemDetails);

        _mockProblemDetailsService
            .Setup(x => x.TryWriteAsync(It.IsAny<ProblemDetailsContext>()))
            .ReturnsAsync(true);

        var middleware = new Rfc9457ErrorHandlingMiddleware(
            next: (context) => throw validationException,
            _mockLogger.Object,
            _mockProblemDetailsService.Object,
            _mockCustomProblemDetailsService.Object
        );

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.StatusCode.Should().Be((int)HttpStatusCode.UnprocessableEntity);
        _mockCustomProblemDetailsService.Verify(
            x => x.CreateValidationProblemDetails(It.IsAny<ValidationException>(), context), 
            Times.Once);
        _mockProblemDetailsService.Verify(
            x => x.TryWriteAsync(It.Is<ProblemDetailsContext>(ctx => 
                ctx.HttpContext == context && 
                ctx.ProblemDetails == expectedProblemDetails)), 
            Times.Once);
    }

    [Fact]
    public async Task InvokeAsync_WithUnauthorizedAccessException_ShouldReturnAuthenticationProblemDetails()
    {
        // Arrange
        var context = CreateHttpContext();
        var unauthorizedException = new UnauthorizedAccessException("Access denied");

        var expectedProblemDetails = new ProblemDetails
        {
            Type = ProblemTypes.AuthenticationError,
            Title = "Authentication required",
            Status = (int)HttpStatusCode.Unauthorized,
            Detail = "Access denied",
            Instance = "/api/test"
        };

        _mockCustomProblemDetailsService
            .Setup(x => x.CreateProblemDetails(It.IsAny<UnauthorizedAccessException>(), It.IsAny<HttpContext>()))
            .Returns(expectedProblemDetails);

        _mockProblemDetailsService
            .Setup(x => x.TryWriteAsync(It.IsAny<ProblemDetailsContext>()))
            .ReturnsAsync(true);

        var middleware = new Rfc9457ErrorHandlingMiddleware(
            next: (context) => throw unauthorizedException,
            _mockLogger.Object,
            _mockProblemDetailsService.Object,
            _mockCustomProblemDetailsService.Object
        );

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.StatusCode.Should().Be((int)HttpStatusCode.Unauthorized);
        _mockCustomProblemDetailsService.Verify(
            x => x.CreateProblemDetails(It.IsAny<UnauthorizedAccessException>(), context), 
            Times.Once);
        _mockProblemDetailsService.Verify(
            x => x.TryWriteAsync(It.Is<ProblemDetailsContext>(ctx => 
                ctx.HttpContext == context && 
                ctx.ProblemDetails == expectedProblemDetails)), 
            Times.Once);
    }

    [Fact]
    public async Task InvokeAsync_WithKeyNotFoundException_ShouldReturnNotFoundProblemDetails()
    {
        // Arrange
        var context = CreateHttpContext();
        var notFoundException = new KeyNotFoundException("Resource not found");

        var expectedProblemDetails = new ProblemDetails
        {
            Type = ProblemTypes.NotFoundError,
            Title = "Resource not found",
            Status = (int)HttpStatusCode.NotFound,
            Detail = "Resource not found",
            Instance = "/api/test"
        };

        _mockCustomProblemDetailsService
            .Setup(x => x.CreateProblemDetails(It.IsAny<KeyNotFoundException>(), It.IsAny<HttpContext>()))
            .Returns(expectedProblemDetails);

        _mockProblemDetailsService
            .Setup(x => x.TryWriteAsync(It.IsAny<ProblemDetailsContext>()))
            .ReturnsAsync(true);

        var middleware = new Rfc9457ErrorHandlingMiddleware(
            next: (context) => throw notFoundException,
            _mockLogger.Object,
            _mockProblemDetailsService.Object,
            _mockCustomProblemDetailsService.Object
        );

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.StatusCode.Should().Be((int)HttpStatusCode.NotFound);
        _mockCustomProblemDetailsService.Verify(
            x => x.CreateProblemDetails(It.IsAny<KeyNotFoundException>(), context), 
            Times.Once);
    }

    [Fact]
    public async Task InvokeAsync_WithConflictException_ShouldReturnConflictProblemDetails()
    {
        // Arrange
        var context = CreateHttpContext();
        var conflictException = new InvalidOperationException("User already exists");

        var expectedProblemDetails = new ProblemDetails
        {
            Type = ProblemTypes.ConflictError,
            Title = "Resource conflict",
            Status = (int)HttpStatusCode.Conflict,
            Detail = "User already exists",
            Instance = "/api/test"
        };

        _mockCustomProblemDetailsService
            .Setup(x => x.CreateProblemDetails(It.IsAny<InvalidOperationException>(), It.IsAny<HttpContext>()))
            .Returns(expectedProblemDetails);

        _mockProblemDetailsService
            .Setup(x => x.TryWriteAsync(It.IsAny<ProblemDetailsContext>()))
            .ReturnsAsync(true);

        var middleware = new Rfc9457ErrorHandlingMiddleware(
            next: (context) => throw conflictException,
            _mockLogger.Object,
            _mockProblemDetailsService.Object,
            _mockCustomProblemDetailsService.Object
        );

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.StatusCode.Should().Be((int)HttpStatusCode.Conflict);
        _mockCustomProblemDetailsService.Verify(
            x => x.CreateProblemDetails(It.IsAny<InvalidOperationException>(), context), 
            Times.Once);
    }

    [Fact]
    public async Task InvokeAsync_WithArgumentException_ShouldReturnBadRequestProblemDetails()
    {
        // Arrange
        var context = CreateHttpContext();
        var argumentException = new ArgumentException("Invalid argument");

        var expectedProblemDetails = new ProblemDetails
        {
            Type = ProblemTypes.BadRequestError,
            Title = "Invalid request",
            Status = (int)HttpStatusCode.BadRequest,
            Detail = "Invalid argument",
            Instance = "/api/test"
        };

        _mockCustomProblemDetailsService
            .Setup(x => x.CreateProblemDetails(It.IsAny<ArgumentException>(), It.IsAny<HttpContext>()))
            .Returns(expectedProblemDetails);

        _mockProblemDetailsService
            .Setup(x => x.TryWriteAsync(It.IsAny<ProblemDetailsContext>()))
            .ReturnsAsync(true);

        var middleware = new Rfc9457ErrorHandlingMiddleware(
            next: (context) => throw argumentException,
            _mockLogger.Object,
            _mockProblemDetailsService.Object,
            _mockCustomProblemDetailsService.Object
        );

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.StatusCode.Should().Be((int)HttpStatusCode.BadRequest);
        _mockCustomProblemDetailsService.Verify(
            x => x.CreateProblemDetails(It.IsAny<ArgumentException>(), context), 
            Times.Once);
    }

    [Fact]
    public async Task InvokeAsync_WithGenericException_ShouldReturnInternalServerErrorProblemDetails()
    {
        // Arrange
        var context = CreateHttpContext();
        var genericException = new Exception("Internal error");

        var expectedProblemDetails = new ProblemDetails
        {
            Type = ProblemTypes.InternalServerError,
            Title = "An error occurred while processing your request.",
            Status = (int)HttpStatusCode.InternalServerError,
            Detail = "An internal server error occurred",
            Instance = "/api/test"
        };

        _mockCustomProblemDetailsService
            .Setup(x => x.CreateProblemDetails(It.IsAny<Exception>(), It.IsAny<HttpContext>()))
            .Returns(expectedProblemDetails);

        _mockProblemDetailsService
            .Setup(x => x.TryWriteAsync(It.IsAny<ProblemDetailsContext>()))
            .ReturnsAsync(true);

        var middleware = new Rfc9457ErrorHandlingMiddleware(
            next: (context) => throw genericException,
            _mockLogger.Object,
            _mockProblemDetailsService.Object,
            _mockCustomProblemDetailsService.Object
        );

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.StatusCode.Should().Be((int)HttpStatusCode.InternalServerError);
        _mockCustomProblemDetailsService.Verify(
            x => x.CreateProblemDetails(It.IsAny<Exception>(), context), 
            Times.Once);
    }

    [Fact]
    public async Task InvokeAsync_WhenProblemDetailsServiceFails_ShouldFallbackToDirectResponse()
    {
        // Arrange
        var context = CreateHttpContext();
        var exception = new ArgumentException("Invalid argument");

        var expectedProblemDetails = new ProblemDetails
        {
            Type = ProblemTypes.BadRequestError,
            Title = "Invalid request",
            Status = (int)HttpStatusCode.BadRequest,
            Detail = "Invalid argument",
            Instance = "/api/test"
        };

        _mockCustomProblemDetailsService
            .Setup(x => x.CreateProblemDetails(It.IsAny<ArgumentException>(), It.IsAny<HttpContext>()))
            .Returns(expectedProblemDetails);

        // Simulate ProblemDetailsService failure
        _mockProblemDetailsService
            .Setup(x => x.TryWriteAsync(It.IsAny<ProblemDetailsContext>()))
            .ReturnsAsync(false);

        var middleware = new Rfc9457ErrorHandlingMiddleware(
            next: (context) => throw exception,
            _mockLogger.Object,
            _mockProblemDetailsService.Object,
            _mockCustomProblemDetailsService.Object
        );

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.StatusCode.Should().Be((int)HttpStatusCode.BadRequest);
        
        // Verify fallback was used
        _mockProblemDetailsService.Verify(
            x => x.TryWriteAsync(It.IsAny<ProblemDetailsContext>()), 
            Times.Once);
            
        // Verify response body contains ProblemDetails JSON
        context.Response.Body.Position = 0;
        using var reader = new StreamReader(context.Response.Body);
        var responseBody = await reader.ReadToEndAsync();
        responseBody.Should().Contain("\"type\":");
        responseBody.Should().Contain("\"title\":");
        responseBody.Should().Contain("\"status\":");
    }

    [Fact]
    public async Task InvokeAsync_WithNoException_ShouldCallNextMiddleware()
    {
        // Arrange
        var context = CreateHttpContext();
        var nextCalled = false;

        var middleware = new Rfc9457ErrorHandlingMiddleware(
            next: (context) => { nextCalled = true; return Task.CompletedTask; },
            _mockLogger.Object,
            _mockProblemDetailsService.Object,
            _mockCustomProblemDetailsService.Object
        );

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        nextCalled.Should().BeTrue();
        _mockCustomProblemDetailsService.Verify(
            x => x.CreateProblemDetails(It.IsAny<Exception>(), It.IsAny<HttpContext>()), 
            Times.Never);
        _mockProblemDetailsService.Verify(
            x => x.TryWriteAsync(It.IsAny<ProblemDetailsContext>()), 
            Times.Never);
    }

    private static HttpContext CreateHttpContext()
    {
        var context = new DefaultHttpContext();
        context.Request.Path = "/api/test";
        context.Response.Body = new MemoryStream();
        return context;
    }
}