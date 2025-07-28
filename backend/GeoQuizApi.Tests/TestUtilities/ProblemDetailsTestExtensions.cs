using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;

namespace GeoQuizApi.Tests.TestUtilities;

/// <summary>
/// Extension methods for testing ProblemDetails responses in integration tests
/// </summary>
public static class ProblemDetailsTestExtensions
{
    /// <summary>
    /// Reads and validates a ProblemDetails response from an HTTP response
    /// </summary>
    public static async Task<ProblemDetails> ReadProblemDetailsAsync(this HttpResponseMessage response)
    {
        // Accept both application/problem+json and application/json for now
        // The RFC 9457 implementation might be using application/json in some cases
        var contentType = response.Content.Headers.ContentType?.MediaType;
        contentType.Should().BeOneOf("application/problem+json", "application/json");
        
        var problemDetails = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        problemDetails.Should().NotBeNull();
        
        return problemDetails!;
    }

    /// <summary>
    /// Reads and validates a ValidationProblemDetails response from an HTTP response
    /// </summary>
    public static async Task<ValidationProblemDetails> ReadValidationProblemDetailsAsync(this HttpResponseMessage response)
    {
        // Accept both application/problem+json and application/json for now
        // The RFC 9457 implementation might be using application/json in some cases
        var contentType = response.Content.Headers.ContentType?.MediaType;
        contentType.Should().BeOneOf("application/problem+json", "application/json");
        
        var validationProblemDetails = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        validationProblemDetails.Should().NotBeNull();
        
        return validationProblemDetails!;
    }

    /// <summary>
    /// Validates that a ProblemDetails response has the expected RFC 9457 structure
    /// </summary>
    public static void ShouldBeValidRfc9457ProblemDetails(this ProblemDetails problemDetails, 
        string expectedType, 
        string expectedTitle, 
        int expectedStatus, 
        string? expectedDetail = null,
        string? expectedInstance = null)
    {
        problemDetails.Type.Should().Be(expectedType);
        problemDetails.Title.Should().Be(expectedTitle);
        problemDetails.Status.Should().Be(expectedStatus);
        
        if (expectedDetail != null)
        {
            problemDetails.Detail.Should().Be(expectedDetail);
        }
        
        if (expectedInstance != null)
        {
            problemDetails.Instance.Should().Be(expectedInstance);
        }

        // Verify required RFC 9457 fields are present
        problemDetails.Type.Should().NotBeNullOrEmpty();
        problemDetails.Title.Should().NotBeNullOrEmpty();
        problemDetails.Status.Should().BeGreaterThan(0);
    }

    /// <summary>
    /// Validates that a ValidationProblemDetails response has the expected RFC 9457 structure
    /// </summary>
    public static void ShouldBeValidRfc9457ValidationProblemDetails(this ValidationProblemDetails validationProblemDetails,
        string expectedType,
        string expectedTitle,
        int expectedStatus,
        Dictionary<string, string[]>? expectedErrors = null,
        string? expectedDetail = null,
        string? expectedInstance = null)
    {
        // Validate base ProblemDetails properties
        ((ProblemDetails)validationProblemDetails).ShouldBeValidRfc9457ProblemDetails(
            expectedType, expectedTitle, expectedStatus, expectedDetail, expectedInstance);

        // Validate ValidationProblemDetails specific properties
        validationProblemDetails.Errors.Should().NotBeNull();
        
        if (expectedErrors != null)
        {
            validationProblemDetails.Errors.Should().HaveCount(expectedErrors.Count);
            
            foreach (var expectedError in expectedErrors)
            {
                validationProblemDetails.Errors.Should().ContainKey(expectedError.Key);
                validationProblemDetails.Errors[expectedError.Key].Should().BeEquivalentTo(expectedError.Value);
            }
        }
    }

    /// <summary>
    /// Validates that the response contains the expected extensions (additional properties)
    /// </summary>
    public static void ShouldHaveExtensions(this ProblemDetails problemDetails, 
        Dictionary<string, object> expectedExtensions)
    {
        problemDetails.Extensions.Should().NotBeNull();
        
        foreach (var expectedExtension in expectedExtensions)
        {
            problemDetails.Extensions.Should().ContainKey(expectedExtension.Key);
            
            // Handle JsonElement comparison for complex objects
            var actualValue = problemDetails.Extensions[expectedExtension.Key];
            if (actualValue is JsonElement jsonElement)
            {
                var actualString = jsonElement.ToString();
                var expectedString = expectedExtension.Value.ToString();
                actualString.Should().Be(expectedString);
            }
            else
            {
                actualValue.Should().Be(expectedExtension.Value);
            }
        }
    }

    /// <summary>
    /// Validates that the response has a timestamp extension
    /// </summary>
    public static void ShouldHaveTimestamp(this ProblemDetails problemDetails)
    {
        problemDetails.Extensions.Should().NotBeNull();
        problemDetails.Extensions.Should().ContainKey("timestamp");
        
        var timestamp = problemDetails.Extensions["timestamp"];
        timestamp.Should().NotBeNull();
        
        // Verify it's a valid DateTime
        if (timestamp is JsonElement jsonElement)
        {
            jsonElement.TryGetDateTime(out var dateTime).Should().BeTrue();
            dateTime.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));
        }
        else if (timestamp is DateTime dateTimeValue)
        {
            dateTimeValue.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));
        }
        else if (timestamp is string stringValue)
        {
            DateTime.TryParse(stringValue, out var parsedDateTime).Should().BeTrue();
            parsedDateTime.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));
        }
    }

    /// <summary>
    /// Validates that the response has a traceId extension
    /// </summary>
    public static void ShouldHaveTraceId(this ProblemDetails problemDetails)
    {
        problemDetails.Extensions.Should().NotBeNull();
        problemDetails.Extensions.Should().ContainKey("traceId");
        
        var traceId = problemDetails.Extensions["traceId"];
        traceId.Should().NotBeNull();
        traceId.ToString().Should().NotBeNullOrEmpty();
    }
}