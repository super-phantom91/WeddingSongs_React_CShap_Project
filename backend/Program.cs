using Microsoft.EntityFrameworkCore;
using WeddingSong.Api.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var env = builder.Environment;
builder.Services.AddDbContext<WeddingDbContext>(options =>
{
    var cs = builder.Configuration.GetConnectionString("WeddingSong")
             ?? throw new InvalidOperationException("Connection string 'WeddingSong' not found.");
    options.UseSqlServer(cs);
    if (env.IsDevelopment())
    {
        options.EnableDetailedErrors();
        options.EnableSensitiveDataLogging();
    }
});

builder.Services.AddCors(o =>
{
    // Development: any localhost / 127.0.0.1 port (webpack may use PORT env if 5173 is taken).
    o.AddPolicy("dev", p => p
        .SetIsOriginAllowed(static origin =>
        {
            if (string.IsNullOrEmpty(origin)) return false;
            if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri)) return false;
            return string.Equals(uri.Host, "localhost", StringComparison.OrdinalIgnoreCase)
                   || uri.Host == "127.0.0.1";
        })
        .AllowAnyHeader()
        .AllowAnyMethod());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("dev");
app.MapControllers();

app.Run();
